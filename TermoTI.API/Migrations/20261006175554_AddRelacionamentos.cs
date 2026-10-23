using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TermoTI.API.Migrations
{
    public partial class AddRelacionamentos : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "TermoItens",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    TermoId = table.Column<int>(type: "int", nullable: false),
                    EquipamentoId = table.Column<int>(type: "int", nullable: false),
                    Observacao = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TermoItens", x => x.Id);
                    table.ForeignKey(
                        name: "FK_TermoItens_Equipamentos_EquipamentoId",
                        column: x => x.EquipamentoId,
                        principalTable: "Equipamentos",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_TermoItens_Termos_TermoId",
                        column: x => x.TermoId,
                        principalTable: "Termos",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Termos_ColaboradorId",
                table: "Termos",
                column: "ColaboradorId");

            migrationBuilder.CreateIndex(
                name: "IX_Equipamentos_ResponsavelId",
                table: "Equipamentos",
                column: "ResponsavelId");

            migrationBuilder.CreateIndex(
                name: "IX_TermoItens_EquipamentoId",
                table: "TermoItens",
                column: "EquipamentoId");

            migrationBuilder.CreateIndex(
                name: "IX_TermoItens_TermoId",
                table: "TermoItens",
                column: "TermoId");

            migrationBuilder.AddForeignKey(
                name: "FK_Equipamentos_Colaboradores_ResponsavelId",
                table: "Equipamentos",
                column: "ResponsavelId",
                principalTable: "Colaboradores",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_Termos_Colaboradores_ColaboradorId",
                table: "Termos",
                column: "ColaboradorId",
                principalTable: "Colaboradores",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Equipamentos_Colaboradores_ResponsavelId",
                table: "Equipamentos");

            migrationBuilder.DropForeignKey(
                name: "FK_Termos_Colaboradores_ColaboradorId",
                table: "Termos");

            migrationBuilder.DropTable(
                name: "TermoItens");

            migrationBuilder.DropIndex(
                name: "IX_Termos_ColaboradorId",
                table: "Termos");

            migrationBuilder.DropIndex(
                name: "IX_Equipamentos_ResponsavelId",
                table: "Equipamentos");
        }
    }
}
