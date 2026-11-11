namespace TermoTI.API.DTOs;

public class SolicitarCodigoEmailDto
{
    public string Email { get; set; } = string.Empty;
}

public class ConfirmarCodigoEmailDto : SolicitarCodigoEmailDto
{
    public string Codigo { get; set; } = string.Empty;
}

public class SolicitarCodigoAssinaturaDto
{
    public string Email { get; set; } = string.Empty;
}

public class ConfirmarCodigoAssinaturaDto
{
    public int CodigoAutorizacaoId { get; set; }
    public string Codigo { get; set; } = string.Empty;
}

