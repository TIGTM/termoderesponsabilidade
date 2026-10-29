namespace TermoTI.API.Models;

public class Termo
{
    public int Id { get; set; }

    public int ColaboradorId { get; set; }

    public string TipoTermo { get; set; } = "CPF";

    public string? Status { get; set; }

    public DateTime? DataAssinatura { get; set; }

    public byte[]? Assinatura { get; set; }

    public string? DocumentoHTML { get; set; }

    public DateTime CriadoEm { get; set; } = DateTime.Now;

    public string? IPAssinatura { get; set; }

    public decimal? Latitude { get; set; }

    public decimal? Longitude { get; set; }

    public decimal? PrecisaoLocalizacao { get; set; }

    public string? TipoDocumento { get; set; }

    public string? NomeDocumento { get; set; }

    public byte[]? DocumentoFrente { get; set; }

    public byte[]? DocumentoVerso { get; set; }
}