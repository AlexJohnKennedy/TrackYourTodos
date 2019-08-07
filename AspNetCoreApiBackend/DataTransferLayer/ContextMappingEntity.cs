using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;

namespace todo_app.DataTransferLayer.Entities {
    // This is a database model class, which defines the data which will sit in the 'context mapping' table, used for storing 
    // context name and colouring mappings for a given user.
    // The 'IdString' field corresponds to the data saved in the todo-event 'context' field, i.e., is a foreign key in that data.
    public class ContextMapping {
        [Key]
        public int DatabaseId { get; set; }

        // This is the 'id string' of the context. This is NOT the database id.
        [Required]
        [StringLength(58)]  // 20 is max name size, plus 36 (32 + 4 hyphens) for a potential uuid prefix, plus 2 for the '$$' delimiter
        public string Id { get; set; }

        [Required]
        public string UserId { get; set; }

        [StringLength(20)]
        public string Name { get; set; }

        [Required]
        public int Colourid { get; set; }

        [Required]
        public bool Deleted { get; set; }

        public static ContextMapping BuildNewContext(string id, string userId) {
            // If the id begins with a uuid string, concatenated with a name via '$$' characters, then we need to strip out that prefix and set the suffix as the 'name'.
            string name = null;
            if (id.Length > 38) {
                name = id.Substring(38);
            }
            ContextMapping toRet = new ContextMapping();
            toRet.Id = id;
            toRet.Name = name;
            toRet.Colourid = -1;     // New contexts always default to -1, which represents 'no colour specified'. This is the colour id the Global context always has.
            toRet.UserId = userId;
            toRet.Deleted = false;
            return toRet;
        }
    }

    public class ContextMappingComparer : EqualityComparer<ContextMapping> {
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
}