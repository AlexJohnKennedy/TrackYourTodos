using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using System.Globalization;
using System.IdentityModel.Tokens.Jwt;

using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using Microsoft.IdentityModel.Tokens;

using Newtonsoft.Json;
using Newtonsoft.Json.Linq;

using todo_app.Services.AuthenticationHelpers;


namespace todo_app.GoogleAuthenticationMiddlewares {

    // This is a custom middleware which is responsible for acquiring latest public keys from a publicly available source,
    // and attaching it to the HttpContext object so that it is available for use in Authentication by the Authentication middleware.
    // This is used specifically for JWT bearer token validation using TokenValidationParameters injected into the built-in 
    // JwtBearerHandler system, which is invoked by the ASP.NET Core 2.2 Authentication middleware if .AddJwtBearer() is called in
    // configuration.
    //
    // Thus, this middleware should sit immediately before the Authentication middleware in the middleware pipeline.
    //
    // This middleware carries out its duties by dependending on a Singleton 'RemotePublicKeyProvider' service, which will be configured
    // to access and cache the keys such that the latest is always available. This service provides method(s) which asynchronously
    // fetches the latest key(s) in some number of formats.
    public class PublicKeyFetchingMiddleware {

        // This is a reference to the next middleware component in the pipeline, injected to us by the framework upon pipeline construction
        // and middleware instantiation. We must call this delegate and pass it the HttpContext in order to continue request processing.
        private readonly RequestDelegate next;

        // Addition dependencies we require from dependency injection container.
        private readonly IRemotePublicKeyProvider publicKeyProvider;
        private readonly ILogger logger;

        // Public constructor which recieves dependencies from constructor injection.
        public PublicKeyFetchingMiddleware(RequestDelegate next, IRemotePublicKeyProvider publicKeyProvider, ILogger<PublicKeyFetchingMiddleware> logger) {
            this.next = next;
            this.publicKeyProvider = publicKeyProvider;
            this.logger = logger;
        }

        // This is called by the preceeding middleware, and serves as the entry point this middleware for each incoming request!
        // In our case, we delegate all of this responsibility to our provider service, and simply attach the results to the HttpContext.
        public async Task InvokeAsyc(HttpContext httpContext) {
            string jsonWebKeyString = await publicKeyProvider.FetchJsonWebKeysAsJsonString();

            // Parse the JSON string into Security key objects, stored in an enumerable list, and attach it to the HttpContext object.
            var keys = parseJsonIntoKeys(jsonWebKeyString);

            // Stash them in the HttpContext so later middleware can access them.
            JWKRetriever.PlaceKeysIntoHttpContext(httpContext, keys);

            // Continue the pipeline by invoking the next middleware.
            await next(httpContext);
        }

        private IEnumerable<SecurityKey> parseJsonIntoKeys(string json) {
            JObject rootJsonObj = JObject.Parse(json);
            JArray keysArray = JArray.Parse(rootJsonObj["keys"].ToString());
            List<SecurityKey> l = new List<SecurityKey>();
            foreach (JToken item in keysArray) {
                l.Add(new JsonWebKey(item.ToString()));
            }
            return l;
        }
    }

    // Helper class which cleanly encapsulates the logic of placing the fetched keys into the HttpContext.Items dictionary, and retreving them.
    // This is done so that the key used to place and retreive them into the Items dictionary is controlled in a centralised location and hidden away
    // from users.
    internal static class JWKRetriever {
        private const string jwkCollectionKey = "fetchedKeys";
        public static void PlaceKeysIntoHttpContext(HttpContext context, IEnumerable<SecurityKey> keys) {
            context.Items.Add(jwkCollectionKey, keys);
        }
        public static IEnumerable<SecurityKey> GetKeysFromHttpContext(HttpContext context) {
            Object keys = context.Items[jwkCollectionKey];

            if (keys == null || !(keys is IEnumerable<SecurityKey>)) {
                throw new InvalidOperationException("Could not retrive security keys from the HttpContext! Make sure you have PublicKeyFetching middleware setting them "
                + "before this is called, and that fetching is handled by the static helper available on the middleware.");
            }
            return (IEnumerable<SecurityKey>)keys;
        }
    }
}