using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Threading.Tasks;
using todo_app.DataTransferLayer.Entities;
using Microsoft.EntityFrameworkCore;

namespace todo_app.DataTransferLayer.DatabaseContext {
    public class TodoEventContext : DbContext {
        public TodoEventContext(DbContextOptions<TodoEventContext> options) : base(options) {
            /* Do nothing */
        }

        public DbSet<GenericTodoEvent> TodoEvents { get; set; }

        // Provide a value converter for the children array, since arrays of primitives cannot be mapped to a database.
        // We will convert this array into a comma separated string, so it does not require storage in an additional table.
        // SEE: "Value Conversions" in Entity Framework Core documentation
        protected override void OnModelCreating(ModelBuilder modelBuilder) {
            modelBuilder.Entity<GenericTodoEvent>().Property(e => e.Children).HasConversion(
                intArray => string.Join(",", intArray),
                commaSeparatedString => commaSeparatedString.Split(",", StringSplitOptions.RemoveEmptyEntries).Select(s => Guid.Parse(s)).ToArray()
            );
        }
    }
}