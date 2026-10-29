namespace TermoTI.API.DTOs;

public class CriarTermoDto
{
    public int ColaboradorId { get; set; }

    public string TipoTermo { get; set; } = "CPF";

    public string? Status { get; set; }

    public string? DocumentoHTML { get; set; }

    public List<CriarTermoItemDto> Equipamentos { get; set; } = new();
}

public class CriarTermoItemDto
{
    public int EquipamentoId { get; set; }

    public string? Observacao { get; set; }
}