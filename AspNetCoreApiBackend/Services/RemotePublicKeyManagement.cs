using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Threading.Tasks;
using System.Security.Claims;
using System.IdentityModel.Tokens.Jwt;
using System;

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
        // TODO: Task<IEnumerable<SecurityKey>> FetchJsonWebKeys();
    }

    // For testing purposes only; just directly returns stuff.
    public class HardCodedGooglePublicKeyProvider : IRemotePublicKeyProvider {
        public async Task<string> FetchJsonWebKeysAsJsonString() {
            await Task.Delay(250);  // Simulate network call to get key every time.
            return "{\"keys\":[{\"kid\":\"07a082839f2e71a9bf6c596996b94739785afdc3\",\"e\":\"AQAB\",\"kty\":\"RSA\",\"alg\":\"RS256\",\"n\":\"9Y5kfSJyw-GyM4lSXNCVaMKmDdOkYdu5ZhQ7E-8nfae-CPPsx3IZjdUrrv_AoKhM3vsZW_Z3Vucou53YZQuHFpnAa6YxiG9ntpScviU1dhMd4YyUtNYWVBxgNemT9dhhj2i32ez0tOj7o0tGh2Yoo2LiSXRDT-m2zwBImYkBksws4qq_X3jZhlfYkznrCJGjVhKEHzlQy5BBqtQtN5dXFVi-zRZ0-m7oiNW_2wivjw_99li087PNFSeyHpgxjbg30K2qnm1T8gVhnzqf8xnPW9vZFyc_8-3qmbQeDedB8YWyzojM3hDLsHqypP84MSOmejmi0c2b836oc-pI8seXwQ\",\"use\":\"sig\"},{\"e\":\"AQAB\",\"kty\":\"RSA\",\"alg\":\"RS256\",\"n\":\"uNgHfkBGmFZbxa7E0tnsRzarMiE26hnGfwf6PPIbMClW_-VqwwTPXftsnrPbQg93XAKS-r1jQZL54vpVbKJjT7V0TwGpEHplIlLQdSiHLvcUTKPi8ZdG2Promst8khxHTbNDvBhtJwsYXUwLJ3fDF-6v2kTZCHnggQF-tPo4Jumb0WoZYXN74VxmcBU52ypEAlGCxECwpVYOQlrJUzRl7BXvP1EI24D_ZLPLLZd1oP0zz4bFTXeHYm1Q79y8UVBH6o-7nrw9MC1150lSCXX-tXnVJ53f1U2V8PhyDNVy9feTBMO06mvyhl5b3E0aHptgTBUeSFcCIGMvjMgVAO2brw\",\"use\":\"sig\",\"kid\":\"c7f522d032284d252bee4fd80560cefa0fb60c39\"}]}";
        }
    }

}