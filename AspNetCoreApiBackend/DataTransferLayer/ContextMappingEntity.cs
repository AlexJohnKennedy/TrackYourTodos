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
        [StringLength(68)]  // 30 is max name size, plus 36 (32 + 4 hyphens) for a potential uuid prefix, plus 2 for the '$$' delimiter
        public string Id { get; set; }

        [Required]
        public string UserId { get; set; }

        [StringLength(30)]
        public string Name { get; set; }

        [Required]
        public int Colourid { get; set; }
    }

}