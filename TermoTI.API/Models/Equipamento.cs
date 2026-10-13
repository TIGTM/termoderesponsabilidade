namespace TermoTI.API.Models;

public class Equipamento
{
    public int Id { get; set; }

    public string? Patrimonio { get; set; }

    public string? Categoria { get; set; }

    public string? Tipo { get; set; }

    public string? Marca { get; set; }

    public string? Modelo { get; set; }

    public string? Serial { get; set; }

    public int? ResponsavelId { get; set; }

    public string? Email { get; set; }

    public string? Telefone { get; set; }

    public string? Status { get; set; }

    public string? Local { get; set; }

    public string? Setor { get; set; }

    public string? Processador { get; set; }

    public string? MemoriaRam { get; set; }

    public string? Armazenamento { get; set; }

    public string? SistemaOperacional { get; set; }

    public string? NomeRede { get; set; }

    public string? IMEI1 { get; set; }

    public string? IMEI2 { get; set; }

    public string? Capacidade { get; set; }

    public string? Cor { get; set; }

    public string? Condicao { get; set; }

    public string? Observacoes { get; set; }

    public DateTime? DataCompra { get; set; }

    public string? Fornecedor { get; set; }

    public string? NotaFiscal { get; set; }

    public decimal? Valor { get; set; }

    public DateTime? Garantia { get; set; }
}