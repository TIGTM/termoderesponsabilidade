namespace TermoTI.API.Models;

public class TermoItem
{
    public int Id { get; set; }

    public int TermoId { get; set; }

    public int EquipamentoId { get; set; }

    public string? Observacao { get; set; }
}