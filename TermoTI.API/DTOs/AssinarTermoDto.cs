namespace TermoTI.API.DTOs;

public class AssinarTermoDto
{
    public int CodigoAutorizacaoId { get; set; }

    public string Assinatura { get; set; } = string.Empty;

    public decimal? Latitude { get; set; }

    public decimal? Longitude { get; set; }

    public decimal? PrecisaoLocalizacao { get; set; }

    public string? TipoDocumento { get; set; }

    public string? NomeDocumento { get; set; }

    public string? DocumentoFrente { get; set; }

    public string? DocumentoVerso { get; set; }
}
