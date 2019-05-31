using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Threading.Tasks;
using System.Security.Claims;
using System.IdentityModel.Tokens.Jwt;
using System;
using System.Text;
using System.Text.Encodings.Web;

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

namespace todo_app.JwtTestCode {

    public class TestJwtBearerEventHandlers {
        
        private ILogger logger;

        public TestJwtBearerEventHandlers(ILogger logger) {
            this.logger = logger;
        }

        public Task MessageRecievedHandler(MessageReceivedContext messageContext) {
            logger.LogDebug("####### ENTERING CANCER DEBUG MODE ########");

            string rawBearerToken = parseBearerTokenStringFromHttpHeaders(messageContext.HttpContext);

            logger.LogDebug("Raw bearer token: ");
            logger.LogDebug(rawBearerToken);
            
            // Access the built-in handler and see what happens when we do stuff. This is what the JwtBearerHandler uses to validate the token, using the validation paramters, unless we specific our own ISecurityTokenValidator in JwtOptions.
            JwtSecurityTokenHandler jwtSecurityTokenHandler = (JwtSecurityTokenHandler)messageContext.Options.SecurityTokenValidators.ElementAt(0);

            logger.LogDebug("==========> Examining resulting Claims which are returned from standard JwtSecurityTokenHandler.ValidateToken() <============");
            SecurityToken outPutToken;
            try {
                ClaimsPrincipal principalResult = jwtSecurityTokenHandler.ValidateToken(rawBearerToken, messageContext.Options.TokenValidationParameters, out outPutToken);
                foreach (var claim in principalResult.Claims) {
                    logger.LogDebug($"Claim from ClaimsPrincipal.Claims collection: '{claim.Type}, {claim.Value}'");
                }
                logger.LogDebug($"ClaimsPrincipal: {principalResult}");

                logger.LogDebug($"Output SecurityToken object, Id field: {outPutToken.Id}");
                logger.LogDebug($"Output SecurityToken object, Issuer field: {outPutToken.Issuer}");
                logger.LogDebug($"Output SecurityToken object, ValidTo field: {outPutToken.ValidTo}");
            }
            catch(Exception e) {
                logger.LogWarning(e.ToString());
            }

            logger.LogDebug("#################");

            return Task.CompletedTask;
        }

        // Copied from JwtBearerHandler source code. Assumes the Bearer token is actually present under the Authorization header
        private string parseBearerTokenStringFromHttpHeaders(HttpContext httpContext) {
            string authorizationHeader = httpContext.Request.Headers["Authorization"];
            
            if (!string.IsNullOrEmpty(authorizationHeader) && authorizationHeader.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase)) {
                return authorizationHeader.Substring("Bearer ".Length).Trim();
            }
            return null;
        }
    }
}