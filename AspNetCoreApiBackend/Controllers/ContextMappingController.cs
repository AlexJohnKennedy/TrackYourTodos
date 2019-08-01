using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;

using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Cors;

using todo_app.DataTransferLayer.Entities;
using todo_app.DataTransferLayer.DatabaseContext;

namespace todo_app.Controllers {

    [ApiController]
    public class ContextMappingController : ControllerBase {
        private const string googleSubjectClaimType = "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier";
        
        private ILogger logger;
        private TodoEventContext dbContext;

        public ContextMappingController(TodoEventContext injectedContext, ILogger<ContextMappingController> injectedLogger) {
            this.logger = injectedLogger;
            this.dbContext = injectedContext;
        }

        // Endpoint for Renaming Contexts. This will throw 400 responses if the context attempting to be renamed does not actually exist!
        [Authorize]
        [EnableCors("UserFacingApplications")]
        [HttpPut("/contexts")]
        public async Task<IActionResult> RenameContext([FromQuery] string contextid, [FromQuery] string name) {
            HashSet<string> userIdStrings = User.FindAll(googleSubjectClaimType).Select(claim => claim.Value.Trim()).ToHashSet();

            // Get all of the user's current context information from the context mappings table
            ContextMapping matchingcontext = await dbContext.ContextMappings.FirstOrDefaultAsync(e => userIdStrings.Contains(e.UserId.Trim()) && e.Id.Equals(contextid.Trim()));

            // Throw 404 if the context does not exist
            if (matchingcontext == null) {
                return StatusCode(404, $"Context with id-string: {contextid} does not exist. You can not rename a context which does not exist!");
            }
            else {
                // Apply the update, and save!
                matchingcontext.Name = name.ToLower().Trim();
                dbContext.ContextMappings.Update(matchingcontext);
                await dbContext.SaveChangesAsync();

                return Ok(new {
                    id = matchingcontext.Id,
                    name = matchingcontext.Name
                });
            }
        }
    }
}