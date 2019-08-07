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

    // TEMPORARY: ULTRA HACKY WAY TO DO DATABASE MIGRATION LOLOL
    public class Comparer : EqualityComparer<ContextMapping> {
        // We say two todo events are duplicates if they have the same 'type' and refer to the same task, and have the same timestamp.
        // In the case of creation, revival, and failure, we do not check timestamp, since we know this type of event can only be
        // applied to a given task no-more-than once.
        // Note that in the case of 'duplicates', we should always accept the earlier-occurring event as the true event.
        public override bool Equals(ContextMapping c1, ContextMapping c2) {
            if (c1 == null && c2 == null) return true;
            else if (c1 == null || c2 == null) return false;
            else if (!c1.UserId.Equals(c2.UserId)) return false;
            else if (!c1.Id.Equals(c2.Id)) return false;
            return true;
        }
        public override int GetHashCode(ContextMapping e) {
            var data = new { e.Id, e.UserId };
            return data.GetHashCode();
        }
    }

    [ApiController]
    public class ContextMappingController : ControllerBase {
        private const string googleSubjectClaimType = "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier";
        
        private ILogger logger;
        private TodoEventContext dbContext;

        public ContextMappingController(TodoEventContext injectedContext, ILogger<ContextMappingController> injectedLogger) {
            this.logger = injectedLogger;
            this.dbContext = injectedContext;
        }

        // TEMPORARY: ULTRA HACKY WAY TO DO DATABASE MIGRATION LOLOL
        [Authorize]
        [EnableCors("UserFacingApplications")]
        [HttpPut("/hackthemainframe")]
        public async Task<IActionResult> UpdateContexts() {
            HashSet<ContextMapping> set = new HashSet<ContextMapping>(new Comparer());
            IEnumerable<GenericTodoEvent> events = dbContext.TodoEvents.Where(e => true).AsEnumerable();
            foreach (GenericTodoEvent e in events) {
                set.Add(ContextMapping.BuildNewContext(e.Context, e.UserId));
            }
            dbContext.ContextMappings.AddRange(set);
            await dbContext.SaveChangesAsync();
            return Ok(set);
        }

        // Endpoint for Renaming Contexts. This will throw 400 responses if the context attempting to be renamed does not actually exist!
        [Authorize]
        [EnableCors("UserFacingApplications")]
        [HttpPut("/contexts")]
        public async Task<IActionResult> RenameContext([FromQuery] string contextid, [FromQuery] string name) {
            if (name == null || name.Trim().Count() == 0) {
                return StatusCode(400, "'name' query parameter must not be null or empty!");
            }
            else if (await dbContext.ContextMappings.FirstOrDefaultAsync(e => e.Name != null && e.Name.Equals(name.Trim().ToLower())) != null) {
                return StatusCode(400, $"The name '{name.Trim().ToLower()} is already taken by another context.");
            }
            HashSet<string> userIdStrings = User.FindAll(googleSubjectClaimType).Select(claim => claim.Value.Trim()).ToHashSet();
            return await MutateContextRecord(userIdStrings, contextid, false, c => c.Name = name.Trim().ToLower(), c => Ok(new { id = c.Id, name = c.Name }));
        }

        // Endpoint for Soft-deleting Contexts. This will throw 400 responses if the context attempting to be renamed does not actually exist!
        [Authorize]
        [EnableCors("UserFacingApplications")]
        [HttpDelete("/contexts")]
        public async Task<IActionResult> DeleteContext([FromQuery] string contextid) {
            HashSet<string> userIdStrings = User.FindAll(googleSubjectClaimType).Select(claim => claim.Value.Trim()).ToHashSet();
            return await MutateContextRecord(userIdStrings, contextid, false, c => c.Deleted = true, c => Ok(new { id = c.Id, deletedFlag = c.Deleted }));
        }

        // Endpoint for Reviving soft-deleted Contexts. This will throw 400 responses if the context attempting to be renamed does not actually exist!
        [Authorize]
        [EnableCors("UserFacingApplications")]
        [HttpPut("/revivecontext")]
        public async Task<IActionResult> ReviveContext([FromQuery] string contextid) {
            HashSet<string> userIdStrings = User.FindAll(googleSubjectClaimType).Select(claim => claim.Value.Trim()).ToHashSet();
            return await MutateContextRecord(userIdStrings, contextid, false, c => c.Deleted = false, c => Ok(new { id = c.Id, deletedFlag = c.Deleted }));
        }

        [Authorize]
        [EnableCors("UserFacingApplications")]
        [HttpPut("/contextcolours")]
        public async Task<IActionResult> UpdateContextColour([FromQuery] string contextid, [FromQuery] int colourid) {
            HashSet<string> userIdStrings = User.FindAll(googleSubjectClaimType).Select(claim => claim.Value.Trim()).ToHashSet();
            return await MutateContextRecord(userIdStrings, contextid, false, c => c.Colourid = colourid, c => Ok(new { id = c.Id, colourId = c.Colourid }));
        }

        private async Task<IActionResult> MutateContextRecord(HashSet<string> userIdStrings, string contextid, bool throw404OnNull, Action<ContextMapping> MutatorFunc, Func<ContextMapping, IActionResult> BuildSuccessResponse) {
            if (contextid == null || contextid.Trim().Count() == 0) {
                return StatusCode(400, "contextid query parameter must not be null or empty!");
            }

            // Get all of the user's current context information from the context mappings table
            ContextMapping matchingcontext = await dbContext.ContextMappings.FirstOrDefaultAsync(e => userIdStrings.Contains(e.UserId.Trim()) && e.Id.Equals(contextid.Trim()));

            // Throw 404 if the context does not exist and we are set to NOT implicitly create.
            if (matchingcontext == null && throw404OnNull) {
                return StatusCode(404, $"Context with id-string: {contextid} does not exist. You can not rename a context which does not exist!");
            }
            // If the matching context is null, but don't want to throw 404 errors, then we should implicitly create the context!
            else if (matchingcontext == null) {
                string userId = User.FindFirst(googleSubjectClaimType).Value.Trim();
                matchingcontext = ContextMapping.BuildNewContext(contextid, userId);
                MutatorFunc(matchingcontext);
                dbContext.ContextMappings.AddRange(matchingcontext);
                await dbContext.SaveChangesAsync();
                return BuildSuccessResponse(matchingcontext);
            }
            // Apply the update, and save!
            else {
                MutatorFunc(matchingcontext);
                dbContext.ContextMappings.Update(matchingcontext);
                await dbContext.SaveChangesAsync();
                return BuildSuccessResponse(matchingcontext);
            }
        }
    }
}