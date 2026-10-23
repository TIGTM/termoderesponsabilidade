const API_URL = "/api";

async function obterTodosColaboradores() {
    const resposta = await fetch(
        `${API_URL}/colaboradores`
    );

    if (!resposta.ok) {
        throw new Error(
            "Não foi possível carregar os colaboradores."
        );
    }

    return await resposta.json();
}

async function obterTodosEquipamentos() {
    const resposta = await fetch(
        `${API_URL}/equipamentos`
    );

    if (!resposta.ok) {
        throw new Error(
            "Não foi possível carregar os equipamentos."
        );
    }

    return await resposta.json();
}

async function obterEquipamentosDoColaborador(colaboradorId) {
    const [equipamentos, colaboradores] =
        await Promise.all([
            obterTodosEquipamentos(),
            obterTodosColaboradores()
        ]);

    const colaborador = colaboradores.find(
        item =>
            String(item.id) ===
            String(colaboradorId)
    );

    if (!colaborador) {
        return [];
    }

    return equipamentos.filter(
        equipamento =>
            String(equipamento.responsavelId) ===
            String(colaborador.id)
    );
}

async function salvarTermo(termo) {
    const resposta = await fetch(
        `${API_URL}/termos`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(termo)
        }
    );

    if (!resposta.ok) {
        const erro = await resposta.text();

        throw new Error(
            erro ||
            "Não foi possível salvar o termo."
        );
    }

    return await resposta.json();
}

async function obterTermo(id) {
    const resposta = await fetch(
        `${API_URL}/termos/${id}`
    );

    if (!resposta.ok) {
        if (resposta.status === 404) {
            return null;
        }

        throw new Error(
            "Não foi possível carregar o termo."
        );
    }

    return await resposta.json();
}

async function obterTodosTermos() {
    const resposta = await fetch(
        `${API_URL}/termos`
    );

    if (!resposta.ok) {
        throw new Error(
            "Não foi possível carregar os termos."
        );
    }

    return await resposta.json();
}

async function excluirTermo(termoId) {
    const resposta = await fetch(
        `${API_URL}/termos/${termoId}`,
        {
            method: "DELETE"
        }
    );

    if (!resposta.ok) {
        const erro = await resposta.text();

        throw new Error(
            erro ||
            "Não foi possível excluir o termo."
        );
    }

    return true;
}

function normalizarTexto(texto) {
    return String(texto || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim()
        .toLowerCase();
}

function gerarId(texto) {
    return normalizarTexto(texto)
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
}