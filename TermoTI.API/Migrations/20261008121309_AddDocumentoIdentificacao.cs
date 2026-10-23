using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TermoTI.API.Migrations
{
    public partial class AddDocumentoIdentificacao : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<byte[]>(
                name: "DocumentoFrente",
                table: "Termos",
                type: "varbinary(max)",
                nullable: true);

            migrationBuilder.AddColumn<byte[]>(
                name: "DocumentoVerso",
                table: "Termos",
                type: "varbinary(max)",
                nullable: true);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "DocumentoFrente",
                table: "Termos");

            migrationBuilder.DropColumn(
                name: "DocumentoVerso",
                table: "Termos");
        }
    }
}
