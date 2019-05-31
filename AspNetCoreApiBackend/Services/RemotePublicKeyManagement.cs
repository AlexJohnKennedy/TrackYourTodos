using System;
using System.IO;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
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

namespace todo_app.Services.AuthenticationHelpers {
    
    public interface IRemotePublicKeyProvider {
        Task<string> FetchJsonWebKeysAsJsonString();
        Task<IEnumerable<SecurityKey>> FetchSecurityKeys();
    }

    // For testing purposes only; just directly returns stuff.
    public class HardCodedGooglePublicKeyProvider : IRemotePublicKeyProvider {
        public async Task<string> FetchJsonWebKeysAsJsonString() {
            await Task.Delay(250);  // Simulate network call to get key every time.
            return "{\"keys\":[{\"kid\":\"07a082839f2e71a9bf6c596996b94739785afdc3\",\"e\":\"AQAB\",\"kty\":\"RSA\",\"alg\":\"RS256\",\"n\":\"9Y5kfSJyw-GyM4lSXNCVaMKmDdOkYdu5ZhQ7E-8nfae-CPPsx3IZjdUrrv_AoKhM3vsZW_Z3Vucou53YZQuHFpnAa6YxiG9ntpScviU1dhMd4YyUtNYWVBxgNemT9dhhj2i32ez0tOj7o0tGh2Yoo2LiSXRDT-m2zwBImYkBksws4qq_X3jZhlfYkznrCJGjVhKEHzlQy5BBqtQtN5dXFVi-zRZ0-m7oiNW_2wivjw_99li087PNFSeyHpgxjbg30K2qnm1T8gVhnzqf8xnPW9vZFyc_8-3qmbQeDedB8YWyzojM3hDLsHqypP84MSOmejmi0c2b836oc-pI8seXwQ\",\"use\":\"sig\"},{\"e\":\"AQAB\",\"kty\":\"RSA\",\"alg\":\"RS256\",\"n\":\"uNgHfkBGmFZbxa7E0tnsRzarMiE26hnGfwf6PPIbMClW_-VqwwTPXftsnrPbQg93XAKS-r1jQZL54vpVbKJjT7V0TwGpEHplIlLQdSiHLvcUTKPi8ZdG2Promst8khxHTbNDvBhtJwsYXUwLJ3fDF-6v2kTZCHnggQF-tPo4Jumb0WoZYXN74VxmcBU52ypEAlGCxECwpVYOQlrJUzRl7BXvP1EI24D_ZLPLLZd1oP0zz4bFTXeHYm1Q79y8UVBH6o-7nrw9MC1150lSCXX-tXnVJ53f1U2V8PhyDNVy9feTBMO06mvyhl5b3E0aHptgTBUeSFcCIGMvjMgVAO2brw\",\"use\":\"sig\",\"kid\":\"c7f522d032284d252bee4fd80560cefa0fb60c39\"}]}";
        }
        public async Task<IEnumerable<SecurityKey>> FetchSecurityKeys() {
            string json = await FetchJsonWebKeysAsJsonString();
            return Parser.parseJsonIntoKeys(json);
        }
    }

    // Halfway solution; works technically but requires redundent calls most of the time since it will re-fetch the public keys for every call
    // The final solution will use caching.
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