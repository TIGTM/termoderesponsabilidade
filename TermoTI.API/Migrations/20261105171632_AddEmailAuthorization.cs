using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TermoTI.API.Migrations
{
    /// <inheritdoc />
    public partial class AddEmailAuthorization : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "EmailValidadoEm",
                table: "Colaboradores",
                type: "datetime2",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "CodigosAutorizacao",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ColaboradorId = table.Column<int>(type: "int", nullable: false),
                    TermoId = table.Column<int>(type: "int", nullable: true),
                    Finalidade = table.Column<string>(type: "nvarchar(32)", maxLength: 32, nullable: false),
                    Email = table.Column<string>(type: "nvarchar(254)", maxLength: 254, nullable: false),
                    CodigoHash = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    DocumentoHash = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: true),
                    CriadoEm = table.Column<DateTime>(type: "datetime2", nullable: false),
                    ExpiraEm = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UsadoEm = table.Column<DateTime>(type: "datetime2", nullable: true),
                    Tentativas = table.Column<int>(type: "int", nullable: false),
                    Versao = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CodigosAutorizacao", x => x.Id);
                    table.ForeignKey(
                        name: "FK_CodigosAutorizacao_Colaboradores_ColaboradorId",
                        column: x => x.ColaboradorId,
                        principalTable: "Colaboradores",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_CodigosAutorizacao_Termos_TermoId",
                        column: x => x.TermoId,
                        principalTable: "Termos",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_CodigosAutorizacao_ColaboradorId_Finalidade_CriadoEm",
                table: "CodigosAutorizacao",
                columns: new[] { "ColaboradorId", "Finalidade", "CriadoEm" });

            migrationBuilder.CreateIndex(
                name: "IX_CodigosAutorizacao_TermoId_Finalidade_CriadoEm",
                table: "CodigosAutorizacao",
                columns: new[] { "TermoId", "Finalidade", "CriadoEm" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "CodigosAutorizacao");

            migrationBuilder.DropColumn(
                name: "EmailValidadoEm",
                table: "Colaboradores");
        }
    }
}
