using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TermoTI.API.Migrations
{
    public partial class AddDadosAssinatura : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "IPAssinatura",
                table: "Termos",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "Latitude",
                table: "Termos",
                type: "decimal(10,7)",
                precision: 10,
                scale: 7,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "Longitude",
                table: "Termos",
                type: "decimal(10,7)",
                precision: 10,
                scale: 7,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "NomeDocumento",
                table: "Termos",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "PrecisaoLocalizacao",
                table: "Termos",
                type: "decimal(10,2)",
                precision: 10,
                scale: 2,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "TipoDocumento",
                table: "Termos",
                type: "nvarchar(max)",
                nullable: true);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "IPAssinatura",
                table: "Termos");

            migrationBuilder.DropColumn(
                name: "Latitude",
                table: "Termos");

            migrationBuilder.DropColumn(
                name: "Longitude",
                table: "Termos");

            migrationBuilder.DropColumn(
                name: "NomeDocumento",
                table: "Termos");

            migrationBuilder.DropColumn(
                name: "PrecisaoLocalizacao",
                table: "Termos");

            migrationBuilder.DropColumn(
                name: "TipoDocumento",
                table: "Termos");
        }
    }
}
