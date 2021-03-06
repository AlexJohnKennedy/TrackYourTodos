using System;
using System.IO;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Threading;
using System.Threading.Tasks;
using System.Security.Claims;
using System.IdentityModel.Tokens.Jwt;

using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;

using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using Nito.AsyncEx;

namespace todo_app.Services.AuthenticationHelpers {
    
    public interface IRemotePublicKeyProvider {
        Task<string> FetchJsonWebKeysAsJsonString();
        Task<IEnumerable<SecurityKey>> FetchSecurityKeys();
    }

    // Halfway solution; works technically but requires redundent calls most of the time since it will re-fetch the public keys for every call.
    public class GooglePublicKeyProviderRefetchForEveryRequest : IRemotePublicKeyProvider {
        private IHttpClientFactory httpClientFactory;
        private ILogger logger;

        public GooglePublicKeyProviderRefetchForEveryRequest(IHttpClientFactory httpClientFactory, ILogger<GooglePublicKeyProviderRefetchForEveryRequest> logger) {
            this.httpClientFactory = httpClientFactory;
            this.logger = logger;
        }

        public async Task<string> FetchJsonWebKeysAsJsonString() {
            logger.LogDebug("Requesting googles public keys!");

            HttpClient client = httpClientFactory.CreateClient();
            HttpResponseMessage response = await client.GetAsync("https://www.googleapis.com/oauth2/v3/certs");
            
            if (response.IsSuccessStatusCode) {
                string responseText = await response.Content.ReadAsStringAsync();
                return responseText;
            }
            else {
                throw new IOException("Http request to get public keys failed :( Status code: " + response.StatusCode);
            }
        }
        public async Task<IEnumerable<SecurityKey>> FetchSecurityKeys() {
            string json = await FetchJsonWebKeysAsJsonString();
            return Parser.parseJsonIntoKeys(json);
        }
    }

    // Caches public keys (based on cache-control header) in a thread-safe manner, until we need to fetch them again over HTTPS.
    // While a fetch is occurring, other threads will wait for the result instead of also-fetching.
    // Using AsyncReadWriteLock from Stephen Cleary's Async Locks library, here: https://github.com/StephenCleary/AsyncEx/blob/master/doc/AsyncReaderWriterLock.md
    public class GooglePublicKeyProviderFetchAndCache : IRemotePublicKeyProvider {
        private IHttpClientFactory httpClientFactory;
        private ILogger logger;

        private AsyncReaderWriterLock cacheLock;
        private string cachedKeyString;
        private long cacheExpirationTimeStamp;  // Unix Epoch milliseconds.

        private const long clockSkewTolerance = 2000;

        public GooglePublicKeyProviderFetchAndCache(IHttpClientFactory httpClientFactory, ILogger<GooglePublicKeyProviderFetchAndCache> logger) {
            this.httpClientFactory = httpClientFactory;
            this.logger = logger;

            cacheLock = new AsyncReaderWriterLock();
            cachedKeyString = null;
            cacheExpirationTimeStamp = 0;
        }

        public async Task<string> FetchJsonWebKeysAsJsonString() {
            logger.LogDebug("Middleware is now going to acquire Google's public keys from either a cached value, or over the internet:");

            // Acquire the read lock in order to check the cache time validity. 
            // If we notice that it is expired, attempt to acquire the write lock, and fetch the newest data.
            // If we cannot acquire the write lock, that means another thread is already fetching the data; in which case, we should just wait
            // on the read lock!

            // Using the async lock library, we can 'await' the lock aquisition. The lock will automatically be released when the
            // lock resource is disposed, I.e., after the 'using' block.
            using (await cacheLock.ReaderLockAsync()) {
                // If the cache is not expired, then just return the cached value.
                if (CacheIsValid()) {
                    return cachedKeyString;
                }
            }
            // If we got here, we need to try and fetch new keys since the cache is invalid. Note we must release the read lock first since we
            // do not have an upgradable-read-write-lock that is async.
            using (await cacheLock.WriterLockAsync()) {
                // Double check that no one has literally just fetched stuff (avoid a 'double fetch' when two threads read the invalid cache at
                // at the same time, and both queue up to the write lock)
                if (CacheIsValid()) {
                    return cachedKeyString;
                }
                else {
                    long reqTimestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
                    UpdateCache(reqTimestamp, await ExplicitFetch());
                    return cachedKeyString;
                }
            }
        }
        public async Task<IEnumerable<SecurityKey>> FetchSecurityKeys() {
            string json = await FetchJsonWebKeysAsJsonString();
            return Parser.parseJsonIntoKeys(json);
        }

        // Should only be called once Read or Write lock is held!
        private bool CacheIsValid() {
            long now = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
            return cachedKeyString != null && now < cacheExpirationTimeStamp - clockSkewTolerance;
        }
        // Should only be called once WriteLock is held!
        private async void UpdateCache(long requestTimestamp, HttpResponseMessage response) {
            cacheExpirationTimeStamp = FindExpirationTime(requestTimestamp, response);
            cachedKeyString = await response.Content.ReadAsStringAsync();
        }
        private long FindExpirationTime(long requestTimestamp, HttpResponseMessage response) {
            // If the 'Cache control' header is present, use the max-age term. Else, try and use the 'expires' field.
            IEnumerable<string> cacheHeader;
            if (response.Headers.TryGetValues("Cache-Control", out cacheHeader)) {
                // Assume the first 'max-age' field we find is correct.
                foreach (string value in cacheHeader) {
                    var maxAgeTokens = value.Split(",").Select(s => s.Trim().ToLower()).Where(s => s.StartsWith("max-age="));
                    if (maxAgeTokens.Count() == 0) continue;
                    long maxAgeSeconds = int.Parse(maxAgeTokens.First().Substring("max-age=".Length));
                    return requestTimestamp + (maxAgeSeconds * 1000);
                }
            }
            // TODO: Try and use the 'Expires' header date-time value instead.
            return requestTimestamp + 125000;
        }
        private async Task<HttpResponseMessage> ExplicitFetch() {
            logger.LogDebug("Making an HTTP request to update google's public keys!");

            HttpClient client = httpClientFactory.CreateClient();
            HttpResponseMessage response = await client.GetAsync("https://www.googleapis.com/oauth2/v3/certs");
            
            if (response.IsSuccessStatusCode) {
                return response;
            }
            else {
                throw new IOException("Http request to get public keys failed :( Status code: " + response.StatusCode);
            }
        }
    }

    internal class Parser {
        public static IEnumerable<SecurityKey> parseJsonIntoKeys(string json) {
            JObject rootJsonObj = JObject.Parse(json);
            JArray keysArray = JArray.Parse(rootJsonObj["keys"].ToString());
            List<SecurityKey> l = new List<SecurityKey>();
            foreach (JToken item in keysArray) {
                l.Add(new JsonWebKey(item.ToString()));
            }
            return l;
        }
    }
}