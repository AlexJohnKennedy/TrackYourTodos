using System;
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

using todo_app.DataTransferLayer.DatabaseContext;
using todo_app.JwtTestCode;
using todo_app.JwtAuthenticationHelperMiddlewares;
using todo_app.Services.AuthenticationHelpers;


namespace todo_app.CustomAuthenticationOptions {
    public class MutateTokenValidationParametersOptionSet {

        // TODO: Provide some configurability for the strings and so on which get added here!

        public Action<JwtBearerOptions> OptionsFunc = jwtOptions => {
            // Construct some Token validation params which contain Google Authority and Audience.
            jwtOptions.TokenValidationParameters = new TokenValidationParameters {
                ClockSkew = TimeSpan.FromMinutes(5),    // Allow for 5 minutes of de-sync between token-issuing server and our server. (This is alot)
                ValidateAudience = true,
                ValidAudience = "918054703402-2u53f3l62mpekrao3jkqd6geg3mjvtjq.apps.googleusercontent.com",
                ValidateIssuer = true,
                ValidIssuers = new List<string> { "accounts.google.com", "https://accounts.google.com" },
                ValidateLifetime = true,
            };

            // Attach an event handler which will extract the Google public keys from the HttpContext, which should have been placed there
            // by previous custom middleware.
            // WARNING: I'm not sure if mutating the jwtOptions object mid-request handling is thread safe, if another concurrent request is simulataneously running here. This could potentially be an issue!!
            // WARNING: If it is, we will have to instead completely take over the validation in this event; i.e. instantiate fresh validationParams, and a fresh JwtSecurityTokenHandler, extract the token, validate it directly,
            // WARNING: instnatiate a TokenValidationContext containing the Claims principal and populate Security Token, and then attach the TokenValidationContext.Result to the messageContext.Result.
            // WARNING: In essence, this would be copying the behaviour of the existing validation process, except it would explicitly ensure that this request is handled with isolated instances which won't change from other
            // WARNING: threads! 
            // WARNING: SEE: https://github.com/aspnet/Security/blob/master/src/Microsoft.AspNetCore.Authentication.JwtBearer/JwtBearerHandler.cs for the built-in logic we would have to emulate.
            // WARNING: SEE: https://gist.github.com/twaldecker/da0594baeef0e15466c68112ae375988 for example of how to use the built-in JwtSecurityTokenHandler to manually validate.
            jwtOptions.Events = new JwtBearerEvents() {
                OnMessageReceived = messageContext => {
                    IEnumerable<SecurityKey> keysFromPreviousMiddleware = PublicKeyFetchingMiddleware.RetrieveSecurityKeys(messageContext.HttpContext);
                    messageContext.Options.TokenValidationParameters.IssuerSigningKeys = keysFromPreviousMiddleware;
                    messageContext.Options.TokenValidationParameters.IssuerSigningKeyResolver = (tokenString, securityTokenObj, kidString, validationParamsObj) => {
                        return keysFromPreviousMiddleware.Where(key => key.KeyId.ToUpper() == kidString.ToUpper());
                    };
                    return Task.CompletedTask;
                }
            };
        };
    }
}