using Microsoft.EntityFrameworkCore;
using TermoTI.API.Models;

namespace TermoTI.API.Services;

public static class EquipamentosDoColaborador
{
    public static IQueryable<Equipamento> DisponiveisParaTermo(
        this IQueryable<Equipamento> equipamentos, int colaboradorId)
    {
        return equipamentos.Where(e =>
            e.ResponsavelId == colaboradorId &&
            e.Status != null &&
            !EF.Functions.Collate(e.Status, "Latin1_General_CI_AI").Contains("manutencao") &&
            !EF.Functions.Collate(e.Status, "Latin1_General_CI_AI").Contains("baixa") &&
            !EF.Functions.Collate(e.Status, "Latin1_General_CI_AI").Contains("estoque") &&
            !EF.Functions.Collate(e.Status, "Latin1_General_CI_AI").Contains("historico"));
    }
}
