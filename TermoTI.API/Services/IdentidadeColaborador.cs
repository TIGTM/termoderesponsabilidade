using System.Globalization;
using System.Text;
using System.Text.RegularExpressions;

namespace TermoTI.API.Services;

public static class IdentidadeColaborador
{
    public static string Cpf(string? valor) => Regex.Replace(valor ?? "", @"\D", "");

    public static bool CpfValido(string valor)
    {
        if (valor.Length != 11 || valor.Distinct().Count() == 1) return false;
        for (var tamanho = 9; tamanho <= 10; tamanho++)
        {
            var soma = 0;
            for (var i = 0; i < tamanho; i++) soma += (valor[i] - '0') * (tamanho + 1 - i);
            var digito = (soma * 10) % 11;
            if (digito == 10) digito = 0;
            if (valor[tamanho] - '0' != digito) return false;
        }
        return true;
    }

    public static bool CnpjValido(string valor)
    {
        if (valor.Length != 14 || valor.Distinct().Count() == 1) return false;
        var pesos = new[] { 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2 };
        for (var indice = 0; indice < 2; indice++)
        {
            var soma = 0;
            for (var i = 0; i < pesos.Length + indice; i++)
                soma += (valor[i] - '0') * (indice == 0 ? pesos[i] : new[] { 6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2 }[i]);
            var digito = (soma % 11) < 2 ? 0 : 11 - soma % 11;
            if (valor[12 + indice] - '0' != digito) return false;
        }
        return true;
    }

    public static bool DocumentoValido(string? valor)
    {
        var documento = Cpf(valor);
        return CpfValido(documento) || CnpjValido(documento);
    }

    public static string[] PartesNome(string? nome) => Regex.Matches(
        new string((nome ?? "").Normalize(NormalizationForm.FormD)
            .Where(c => CharUnicodeInfo.GetUnicodeCategory(c) != UnicodeCategory.NonSpacingMark)
            .ToArray()).ToUpperInvariant(), @"\p{L}+")
        .Select(m => m.Value).Where(p => p is not ("DE" or "DA" or "DO" or "DAS" or "DOS" or "E")).ToArray();

    // Exige o mesmo primeiro nome e todos os sobrenomes cadastrados, em ordem.
    // Não usa distância textual: nomes apenas parecidos não comprovam a associação.
    public static bool NomeCompativel(string cadastrado, string informado)
    {
        var origem = PartesNome(cadastrado);
        var completo = PartesNome(informado);
        if (origem.Length < 2 || completo.Length < origem.Length || origem[0] != completo[0]) return false;
        var indice = 1;
        foreach (var parte in completo.Skip(1))
            if (indice < origem.Length && origem[indice] == parte) indice++;
        return indice == origem.Length;
    }
}
