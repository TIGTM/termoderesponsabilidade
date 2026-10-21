const API_URL = "http://localhost:5268/api";

let colaboradores = [];
let equipamentos = [];
let termos = [];
let colaboradorSelecionado = null;

document.addEventListener("DOMContentLoaded", async () => {
    const autenticado = await window.adminAutenticado;

    if (!autenticado) {
        return;
    }

    await carregarDados();
    configurarEventos();
});

async function carregarDados() {
    try {
        console.log("1. Carregando colaboradores...");

        const respostaColaboradores = await fetch(
            `${API_URL}/admin/colaboradores`,
            {
                method: "GET",
                credentials: "include",
                cache: "no-store"
            }
        );

        const textoColaboradores =
            await respostaColaboradores.text();


        if (!respostaColaboradores.ok) {
            throw new Error(textoColaboradores);
        }

        colaboradores = textoColaboradores
            ? JSON.parse(textoColaboradores)
            : [];

        console.log("2. Carregando equipamentos...");

        const respostaEquipamentos = await fetch(
            `${API_URL}/admin/equipamentos`,
            {
                method: "GET",
                credentials: "include",
                cache: "no-store"
            }
        );

        const textoEquipamentos =
            await respostaEquipamentos.text();


        if (!respostaEquipamentos.ok) {
            throw new Error(textoEquipamentos);
        }

        equipamentos = textoEquipamentos
            ? JSON.parse(textoEquipamentos)
            : [];

        console.log("3. Carregando termos...");

        const respostaTermos = await fetch(
            `${API_URL}/admin/termos`,
            {
                method: "GET",
                credentials: "include",
                cache: "no-store"
            }
        );

        const textoTermos =
            await respostaTermos.text();


        if (!respostaTermos.ok) {
            throw new Error(textoTermos);
        }

        termos = textoTermos
            ? JSON.parse(textoTermos)
            : [];

        console.log("4. Renderizando painel...");

        renderizar();
        atualizarEstatisticas();

        document.body.classList.remove(
            "admin-page-loading"
        );

        console.log("Carregamento concluído.");

    } catch (erro) {
        console.error(
            "ERRO AO CARREGAR DADOS:",
            erro
        );

        mostrarToast(
            erro.message ||
            "Erro ao carregar os dados."
        );
    }
}

async function excluirTermoAdmin(id) {
    const colaborador = colaboradores.find(
        item =>
            String(item.id) ===
            String(id)
    );

    if (!colaborador) {
        mostrarToast(
            "Colaborador não encontrado."
        );
        return;
    }

    const confirmou = confirm(
        `Deseja realmente excluir o termo de ${colaborador.nome}?`
    );

    if (!confirmou) {
        return;
    }

    try {
        const termo =
            obterTermoDoColaborador(
                colaborador.id
            );

        if (!termo) {
            mostrarToast(
                "Este colaborador não possui um termo."
            );
            return;
        }

        const resposta = await fetch(
            `${API_URL}/admin/termos/${termo.id}`,
            {
                method: "DELETE",
                credentials: "include"
            }
        );

        if (!resposta.ok) {
            const mensagem =
                await resposta.text();

            throw new Error(
                mensagem ||
                "Não foi possível excluir o termo."
            );
        }

        termos = termos.filter(
            item =>
                String(item.id) !==
                String(termo.id)
        );

        renderizar();
        atualizarEstatisticas();

        mostrarToast(
            "Termo excluído com sucesso."
        );
    } catch (erro) {
        console.error(erro);

        mostrarToast(
            erro.message ||
            "Erro ao excluir o termo."
        );
    }
}

function configurarEventos() {
    const arquivoExcel =
        document.getElementById(
            "arquivoExcel"
        );

    if (arquivoExcel) {
        arquivoExcel.addEventListener(
            "change",
            importarExcel
        );
    }

    const pesquisaColaborador =
        document.getElementById(
            "pesquisaColaborador"
        );

    if (pesquisaColaborador) {
        pesquisaColaborador.addEventListener(
            "input",
            renderizar
        );
    }

    const filtroStatus =
        document.getElementById(
            "filtroStatus"
        );

    if (filtroStatus) {
        filtroStatus.addEventListener(
            "change",
            renderizar
        );
    }
}

async function importarExcel(event) {
    const arquivo =
        event.target.files[0];

    if (!arquivo) {
        return;
    }

    try {
        mostrarToast(
            "Enviando arquivo Excel..."
        );

        const formData =
            new FormData();

        formData.append(
            "arquivo",
            arquivo
        );

        const resposta = await fetch(
            `${API_URL}/admin/importacao/excel`,
            {
                method: "POST",
                credentials: "include",
                body: formData
            }
        );

        if (!resposta.ok) {
            const mensagem =
                await resposta.text();

            throw new Error(
                mensagem ||
                "Erro ao importar o Excel."
            );
        }

        const resultado =
            await resposta.json();

        await carregarDados();

        const arquivoAtual =
            document.getElementById(
                "arquivoAtual"
            );

        if (arquivoAtual) {
            arquivoAtual.textContent =
                arquivo.name;
        }

        mostrarToast(
            `${resultado.registros || 0} registros importados com sucesso.`
        );
    } catch (erro) {
        console.error(erro);

        mostrarToast(
            "Erro ao importar o Excel:\n\n" +
            erro.message
        );
    }

    event.target.value = "";
}

function encontrarLinhaCabecalho(linhas) {
    for (
        let i = 0;
        i < linhas.length;
        i++
    ) {
        const linha =
            linhas[i].map(
                valor =>
                    normalizarTexto(valor)
            );

        if (
            linha.includes(
                "patrimonio"
            )
        ) {
            return i;
        }
    }

    return -1;
}

function obterTermoDoColaborador(colaboradorId) {
    const termosColaborador =
        termos.filter(
            termo =>
                String(termo.colaboradorId) ===
                String(colaboradorId)
        );

    if (!termosColaborador.length) {
        return null;
    }

    const termosAssinados =
        termosColaborador.filter(
            termo =>
                String(
                    termo.status || ""
                ).toLowerCase() ===
                "assinado"
        );

    if (termosAssinados.length) {
        return termosAssinados.sort(
            (a, b) =>
                new Date(
                    b.dataAssinatura ||
                    b.criadoEm
                ) -
                new Date(
                    a.dataAssinatura ||
                    a.criadoEm
                )
        )[0];
    }

    return termosColaborador.sort(
        (a, b) =>
            new Date(b.criadoEm) -
            new Date(a.criadoEm)
    )[0];
}

function obterEquipamentosDoColaboradorLocal(
    colaborador
) {
    if (!colaborador) {
        return [];
    }

    const colaboradorId =
        String(
            colaborador.id ?? ""
        ).trim();

    return equipamentos.filter(
        equipamento => {
            const responsavelId =
                String(
                    equipamento.responsavelId ??
                    equipamento.ResponsavelId ??
                    ""
                ).trim();

            return (
                colaboradorId &&
                responsavelId &&
                colaboradorId ===
                responsavelId
            );
        }
    );
}

function renderizar() {
    const tabela =
        document.getElementById(
            "tabelaColaboradores"
        );

    const vazio =
        document.getElementById(
            "estadoVazio"
        );

    const pesquisaElement =
        document.getElementById(
            "pesquisaColaborador"
        );

    const filtroElement =
        document.getElementById(
            "filtroStatus"
        );

    if (!tabela || !vazio) {
        return;
    }

    const pesquisa =
        normalizarTexto(
            pesquisaElement
                ? pesquisaElement.value
                : ""
        );

    const filtro =
        filtroElement
            ? filtroElement.value
            : "";

    const lista =
        colaboradores
            .map(
                colaborador => {
                    const termo =
                        obterTermoDoColaborador(
                            colaborador.id
                        );

                    const equipamentosColaborador =
                        obterEquipamentosDoColaboradorLocal(
                            colaborador
                        );

                    return {
                        ...colaborador,
                        termo,
                        quantidadeEquipamentos:
                            equipamentosColaborador.length
                    };
                }
            )
            .filter(
                colaborador => {
                    const correspondePesquisa =
                        !pesquisa ||
                        normalizarTexto(
                            colaborador.nome
                        ).includes(
                            pesquisa
                        );

                    if (!correspondePesquisa) {
                        return false;
                    }

                    if (
                        filtro ===
                        "assinado"
                    ) {
                        return Boolean(
                            colaborador.termo &&
                            String(
                                colaborador.termo.status ||
                                ""
                            ).toLowerCase() ===
                            "assinado"
                        );
                    }

                    if (
                        filtro ===
                        "nao-assinado"
                    ) {
                        return !(
                            colaborador.termo &&
                            String(
                                colaborador.termo.status ||
                                ""
                            ).toLowerCase() ===
                            "assinado"
                        );
                    }

                    return true;
                }
            )
            .sort(
                (a, b) =>
                    String(
                        a.nome || ""
                    ).localeCompare(
                        String(
                            b.nome || ""
                        ),
                        "pt-BR"
                    )
            );

    tabela.innerHTML = "";

    const contador =
        document.getElementById(
            "contadorResultados"
        );

    if (contador) {
        contador.textContent =
            `${lista.length} colaborador${lista.length === 1 ? "" : "es"}`;
    }

    if (lista.length === 0) {
        vazio.style.display =
            "flex";
        return;
    }

    vazio.style.display =
        "none";

    lista.forEach(
        colaborador => {
            const assinou =
                colaborador.termo &&
                String(
                    colaborador.termo.status ||
                    ""
                ).toLowerCase() ===
                "assinado";

            const tr =
                document.createElement(
                    "tr"
                );

            tr.innerHTML = `
                <td>
                    <span class="collaborator-name">
                        ${escapeHTML(
                colaborador.nome
            )}
                    </span>
                </td>

                <td>
                    <span class="equipment-count">
                        ${colaborador.quantidadeEquipamentos}
                        equipamento${colaborador.quantidadeEquipamentos === 1 ? "" : "s"}
                    </span>
                </td>

                <td>
                    ${assinou
                    ? `
                                <span class="status status-signed">
                                    ASSINOU
                                </span>
                            `
                    : `
                                <span class="status status-pending">
                                    NÃO ASSINOU
                                </span>
                            `
                }
                </td>

                <td>
                    ${assinou
                    ? `
                                <span class="date-cell">
                                    ${formatarDataHora(
                        colaborador.termo.dataAssinatura
                    )}
                                </span>
                            `
                    : `
                                <span class="date-cell">
                                    —
                                </span>
                            `
                }
                </td>

                <td>
                    <div class="table-actions">

                        <button
                            type="button"
                            class="action-btn"
                            onclick="abrirEquipamentos('${escapeAttribute(
                    colaborador.id
                )}')"
                        >
                            Ver detalhes
                        </button>

                        ${assinou
                    ? `
                                    <button
                                        type="button"
                                        class="action-btn"
                                        onclick="abrirTermo('${escapeAttribute(
                        colaborador.id
                    )}')"
                                    >
                                        Ver termo
                                    </button>

                                    <button
                                        type="button"
                                        class="action-btn action-btn-danger"
                                        onclick="excluirTermoAdmin('${escapeAttribute(
                        colaborador.id
                    )}')"
                                    >
                                        Excluir termo
                                    </button>
                                `
                    : ""
                }

                    </div>
                </td>
            `;

            tabela.appendChild(
                tr
            );
        }
    );
}

function atualizarEstatisticas() {
    const total =
        colaboradores.length;

    const assinados =
        colaboradores.filter(
            colaborador => {
                const termo =
                    obterTermoDoColaborador(
                        colaborador.id
                    );

                return (
                    termo &&
                    String(
                        termo.status || ""
                    ).toLowerCase() ===
                    "assinado"
                );
            }
        ).length;

    const totalColaboradores =
        document.getElementById(
            "totalColaboradores"
        );

    const totalAssinados =
        document.getElementById(
            "totalAssinados"
        );

    const totalNaoAssinados =
        document.getElementById(
            "totalNaoAssinados"
        );

    const totalEquipamentos =
        document.getElementById(
            "totalEquipamentos"
        );

    if (totalColaboradores) {
        totalColaboradores.textContent =
            total;
    }

    if (totalAssinados) {
        totalAssinados.textContent =
            assinados;
    }

    if (totalNaoAssinados) {
        totalNaoAssinados.textContent =
            total - assinados;
    }

    if (totalEquipamentos) {
        totalEquipamentos.textContent =
            equipamentos.length;
    }
}

function abrirEquipamentos(id) {
    const colaborador =
        colaboradores.find(
            item =>
                String(item.id) ===
                String(id)
        );

    if (!colaborador) {
        mostrarToast(
            "Colaborador não encontrado."
        );
        return;
    }

    colaboradorSelecionado =
        colaborador;

    const equipamentosColaborador =
        obterEquipamentosDoColaboradorLocal(
            colaborador
        );

    const termo =
        obterTermoDoColaborador(
            colaborador.id
        );

    const modalNomeColaborador =
        document.getElementById(
            "modalNomeColaborador"
        );

    const modalTotalEquipamentos =
        document.getElementById(
            "modalTotalEquipamentos"
        );

    const modalDataAssinatura =
        document.getElementById(
            "modalDataAssinatura"
        );

    const modalStatusColaborador =
        document.getElementById(
            "modalStatusColaborador"
        );

    if (modalNomeColaborador) {
        modalNomeColaborador.textContent =
            colaborador.nome;
    }

    if (modalTotalEquipamentos) {
        modalTotalEquipamentos.textContent =
            equipamentosColaborador.length;
    }

    const assinou =
        termo &&
        String(
            termo.status || ""
        ).toLowerCase() ===
        "assinado";

    if (modalDataAssinatura) {
        modalDataAssinatura.textContent =
            assinou
                ? formatarDataHora(
                    termo.dataAssinatura
                )
                : "Não assinou";
    }

    if (modalStatusColaborador) {
        modalStatusColaborador.innerHTML =
            assinou
                ? `
                    <span class="status status-signed">
                        ASSINOU
                    </span>
                `
                : `
                    <span class="status status-pending">
                        NÃO ASSINOU
                    </span>
                `;
    }

    const modalIPAssinatura =
        document.getElementById(
            "modalIPAssinatura"
        );

    const modalLatitude =
        document.getElementById(
            "modalLatitude"
        );

    const modalLongitude =
        document.getElementById(
            "modalLongitude"
        );

    const modalPrecisaoLocalizacao =
        document.getElementById(
            "modalPrecisaoLocalizacao"
        );

    if (modalIPAssinatura) {
        modalIPAssinatura.textContent =
            assinou &&
                termo.ipAssinatura
                ? termo.ipAssinatura
                : "Não informado";
    }

    if (modalLatitude) {
        modalLatitude.textContent =
            assinou &&
                termo.latitude !== null &&
                termo.latitude !== undefined
                ? Number(
                    termo.latitude
                ).toFixed(7)
                : "Não informada";
    }

    if (modalLongitude) {
        modalLongitude.textContent =
            assinou &&
                termo.longitude !== null &&
                termo.longitude !== undefined
                ? Number(
                    termo.longitude
                ).toFixed(7)
                : "Não informada";
    }

    if (modalPrecisaoLocalizacao) {
        modalPrecisaoLocalizacao.textContent =
            assinou &&
                termo.precisaoLocalizacao !== null &&
                termo.precisaoLocalizacao !== undefined
                ? `${Number(
                    termo.precisaoLocalizacao
                ).toFixed(2)} metros`
                : "Não informada";
    }

    preencherDadosDocumento(
        termo,
        assinou
    );

    const lista =
        document.getElementById(
            "listaEquipamentos"
        );

    if (!lista) {
        return;
    }

    lista.innerHTML = "";

    if (
        equipamentosColaborador.length === 0
    ) {
        lista.innerHTML = `
            <div
                class="empty-state"
                style="display:flex; min-height:150px;"
            >
                <strong>
                    Nenhum equipamento encontrado
                </strong>

                <span>
                    Não existem equipamentos vinculados a este colaborador.
                </span>
            </div>
        `;
    } else {
        equipamentosColaborador.forEach(
            equipamento => {
                const card =
                    document.createElement(
                        "div"
                    );

                card.className =
                    "equipment-card";

                card.innerHTML = `
                    <div class="equipment-card-header">
                        <div>
                            <div class="equipment-title">
                                ${escapeHTML(
                    equipamento.marca
                )}
                                ${escapeHTML(
                    equipamento.modelo
                )}
                            </div>

                            <div class="equipment-type">
                                ${escapeHTML(
                    equipamento.tipo ||
                    equipamento.categoria ||
                    "Equipamento"
                )}
                            </div>
                        </div>

                        <span class="status ${String(
                    equipamento.status || ""
                ).toLowerCase() ===
                        "em uso"
                        ? "status-signed"
                        : "status-pending"
                    }">
                            ${escapeHTML(
                        equipamento.status ||
                        "—"
                    )}
                        </span>
                    </div>

                    <div class="equipment-grid">

                        ${campoEquipamento(
                        "Patrimônio",
                        equipamento.patrimonio
                    )}

                        ${campoEquipamento(
                        "Número de série",
                        equipamento.serial
                    )}

                        ${campoEquipamento(
                        "Marca",
                        equipamento.marca
                    )}

                        ${campoEquipamento(
                        "Modelo",
                        equipamento.modelo
                    )}

                        ${campoEquipamento(
                        "Local",
                        equipamento.local
                    )}

                        ${campoEquipamento(
                        "Setor",
                        equipamento.setor
                    )}

                        ${campoEquipamento(
                        "Processador",
                        equipamento.processador
                    )}

                        ${campoEquipamento(
                        "Memória RAM",
                        equipamento.memoriaRam
                    )}

                        ${campoEquipamento(
                        "Armazenamento",
                        equipamento.armazenamento
                    )}

                        ${campoEquipamento(
                        "Sistema operacional",
                        equipamento.sistemaOperacional
                    )}

                        ${campoEquipamento(
                        "IMEI 1",
                        equipamento.imei1
                    )}

                        ${campoEquipamento(
                        "IMEI 2",
                        equipamento.imei2
                    )}

                    </div>
                `;

                lista.appendChild(
                    card
                );
            }
        );
    }

    const btnTermo =
        document.getElementById(
            "btnVisualizarTermo"
        );

    if (btnTermo) {
        btnTermo.disabled =
            !assinou;

        btnTermo.style.opacity =
            btnTermo.disabled
                ? "0.5"
                : "1";

        btnTermo.style.cursor =
            assinou
                ? "pointer"
                : "not-allowed";

        btnTermo.onclick =
            assinou
                ? () =>
                    abrirTermo(
                        colaborador.id
                    )
                : null;
    }

    const modalEquipamentos =
        document.getElementById(
            "modalEquipamentos"
        );

    if (modalEquipamentos) {
        modalEquipamentos.classList.add(
            "active"
        );
    }
}

function preencherDadosDocumento(
    termo,
    assinou
) {
    const tipo =
        document.getElementById(
            "modalTipoDocumento"
        );

    const numero =
        document.getElementById(
            "modalNomeDocumento"
        );

    if (tipo) {
        tipo.textContent =
            assinou &&
                termo?.tipoDocumento
                ? termo.tipoDocumento
                : "Não informado";
    }

    if (numero) {
        numero.textContent =
            assinou &&
                termo?.nomeDocumento
                ? termo.nomeDocumento
                : "Não informado";
    }

    preencherImagemDocumento(
        "modalDocumentoFrente",
        "containerDocumentoFrente",
        assinou
            ? termo?.documentoFrente
            : null
    );

    preencherImagemDocumento(
        "modalDocumentoVerso",
        "containerDocumentoVerso",
        assinou
            ? termo?.documentoVerso
            : null
    );
}

function preencherImagemDocumento(
    imagemId,
    containerId,
    imagem
) {
    const imagemElemento =
        document.getElementById(
            imagemId
        );

    const container =
        document.getElementById(
            containerId
        );

    if (!imagemElemento || !container) {
        return;
    }

    if (!imagem) {
        container.style.display = "none";

        imagemElemento.removeAttribute(
            "src"
        );

        return;
    }

    imagemElemento.src = imagem;

    imagemElemento.onerror = () => {
        container.style.display = "none";
    };

    // Deixa a imagem menor
    imagemElemento.style.width = "100%";
    imagemElemento.style.maxWidth = "260px";
    imagemElemento.style.height = "160px";
    imagemElemento.style.objectFit = "contain";
    imagemElemento.style.display = "block";
    imagemElemento.style.margin = "0 auto";

    // Estilo do bloco da foto
    container.style.display = "flex";
    container.style.flexDirection = "column";
    container.style.alignItems = "center";
    container.style.width = "48%";
    container.style.boxSizing = "border-box";

    // Coloca frente e verso lado a lado
    const pai = container.parentElement;

    if (pai) {
        pai.style.display = "flex";
        pai.style.flexWrap = "wrap";
        pai.style.gap = "16px";
        pai.style.alignItems = "flex-start";
        pai.style.justifyContent = "flex-start";
    }
}

function campoEquipamento(
    titulo,
    valor
) {
    if (
        valor === null ||
        valor === undefined ||
        valor === ""
    ) {
        return "";
    }

    return `
        <div class="equipment-field">
            <span>
                ${escapeHTML(titulo)}
            </span>

            <strong>
                ${escapeHTML(valor)}
            </strong>
        </div>
    `;
}

function fecharModalEquipamentos() {
    const modal =
        document.getElementById(
            "modalEquipamentos"
        );

    if (modal) {
        modal.classList.remove(
            "active"
        );
    }

    colaboradorSelecionado =
        null;
}

function fecharModalFora(event) {
    if (
        event.target.id ===
        "modalEquipamentos"
    ) {
        fecharModalEquipamentos();
    }
}

function visualizarTermoSelecionado() {
    if (!colaboradorSelecionado) {
        return;
    }

    abrirTermo(
        colaboradorSelecionado.id
    );
}

function obterCaminhoCSSDoTermo() {
    return new URL(
        "css/style.css",
        window.location.href
    ).href;
}

/*
 * Monta uma página para o iframe usando
 * EXATAMENTE o HTML salvo no banco.
 *
 * Não recria o conteúdo do termo.
 * Não gera texto novo.
 * Não altera os dados do termo.
 */
function criarDocumentoTermoHTML(
    termo,
    titulo = ""
) {
    const caminhoCSS =
        obterCaminhoCSSDoTermo();

    const documento =
        termo?.documentoHTML ||
        "";

    return `
<!DOCTYPE html>
<html lang="pt-BR">

<head>
    <meta charset="UTF-8">

    <meta
        name="viewport"
        content="width=device-width, initial-scale=1.0"
    >

    <title>
        ${escapeHTML(
        titulo ||
        "Termo de Responsabilidade"
    )}
    </title>

    <link
        rel="stylesheet"
        href="${escapeAttribute(
        caminhoCSS
    )}"
    >

    <style>
        html,
        body {
            margin: 0;
            padding: 0;
            background: #ffffff;
        }

        body {
            width: 100%;
            min-height: 100vh;
        }
    </style>
</head>

<body>

    ${documento}

</body>

</html>
    `;
}

async function abrirTermo(idColaborador) {
    try {
        const colaborador =
            colaboradores.find(
                c =>
                    String(c.id) ===
                    String(idColaborador)
            );

        if (!colaborador) {
            mostrarToast(
                "Colaborador não encontrado."
            );
            return;
        }

        colaboradorSelecionado =
            colaborador;

        let termoResumo =
            obterTermoDoColaborador(
                idColaborador
            );

        if (!termoResumo) {
            const resposta =
                await fetch(
                    `${API_URL}/admin/termos`,
                    {
                        method: "GET",
                        credentials: "include",
                        cache: "no-store"
                    }
                );

            if (!resposta.ok) {
                throw new Error(
                    `Erro ao carregar termos: ${resposta.status}`
                );
            }

            const termosAtualizados =
                await resposta.json();

            const termosAssinados =
                termosAtualizados
                    .filter(
                        termo =>
                            String(
                                termo.colaboradorId
                            ) ===
                            String(
                                idColaborador
                            )
                    )
                    .filter(
                        termo =>
                            String(
                                termo.status || ""
                            ).toLowerCase() ===
                            "assinado"
                    )
                    .sort(
                        (a, b) =>
                            new Date(
                                b.dataAssinatura ||
                                b.criadoEm
                            ) -
                            new Date(
                                a.dataAssinatura ||
                                a.criadoEm
                            )
                    );

            if (!termosAssinados.length) {
                mostrarToast(
                    "Este colaborador ainda não assinou nenhum termo."
                );
                return;
            }

            termoResumo =
                termosAssinados[0];
        }


        const respostaTermo =
            await fetch(
                `${API_URL}/admin/termos/${termoResumo.id}`,
                {
                    method: "GET",
                    credentials: "include",
                    cache: "no-store"
                }
            );


        if (!respostaTermo.ok) {
            throw new Error(
                `Erro ao carregar o termo: ${respostaTermo.status}`
            );
        }

        const termoCompleto =
            await respostaTermo.json();

        if (
            !termoCompleto ||
            !termoCompleto.documentoHTML
        ) {
            console.error(
                "A API não retornou documentoHTML.",
                termoCompleto
            );

            mostrarToast(
                "O termo foi encontrado, mas o documento original não foi retornado pela API."
            );

            return;
        }

        window.termoSelecionado =
            termoCompleto;

        const modal =
            document.getElementById(
                "modalTermo"
            );

        const iframe =
            document.getElementById(
                "iframeTermo"
            );

        const titulo =
            document.getElementById(
                "tituloTermo"
            );

        if (!modal || !iframe) {
            console.error(
                "Elementos de visualização do termo não encontrados."
            );

            mostrarToast(
                "Área de visualização do termo não encontrada."
            );

            return;
        }

        if (titulo) {
            titulo.textContent =
                `Termo de Responsabilidade - ${colaborador.nome ||
                colaborador.nomeCompleto ||
                ""
                }`;
        }

        iframe.srcdoc =
            criarDocumentoTermoHTML(
                termoCompleto,
                colaborador.nome
            );

        modal.classList.add(
            "active"
        );

    } catch (erro) {
        console.error(
            "Erro ao visualizar termo:",
            erro
        );

        mostrarToast(
            erro.message ||
            "Não foi possível carregar o termo assinado."
        );
    }
}

function campoInformacaoTermo(
    titulo,
    valor
) {
    return `
        <div style="
            padding:12px;
            background:#f8fafc;
            border:1px solid #e2e8f0;
            border-radius:8px;
        ">
            <div style="
                font-size:12px;
                color:#64748b;
                margin-bottom:5px;
            ">
                ${escapeHTML(titulo)}
            </div>

            <div style="
                font-size:14px;
                font-weight:600;
                color:#1e293b;
                word-break:break-word;
            ">
                ${escapeHTML(
        valor ||
        "Não informado"
    )}
            </div>
        </div>
    `;
}

function fecharModalTermo() {
    const modal =
        document.getElementById(
            "modalTermo"
        );

    if (modal) {
        modal.classList.remove(
            "active"
        );
    }

    const iframe =
        document.getElementById(
            "iframeTermo"
        );

    if (iframe) {
        iframe.srcdoc = "";
    }

    window.termoSelecionado =
        null;
}

function fecharModalTermoFora(event) {
    if (
        event.target.id ===
        "modalTermo"
    ) {
        fecharModalTermo();
    }
}

async function baixarTermoSelecionado() {

    let termo = window.termoSelecionado;

    if (
        !termo &&
        colaboradorSelecionado
    ) {
        const termoResumo =
            obterTermoDoColaborador(
                colaboradorSelecionado.id
            );

        if (termoResumo) {
            try {
                const resposta = await fetch(
                    `${API_URL}/admin/termos/${termoResumo.id}`,
                    {
                        method: "GET",
                        credentials: "include",
                        cache: "no-store"
                    }
                );

                if (resposta.ok) {
                    termo =
                        await resposta.json();
                }
            } catch (erro) {
                console.error(
                    erro
                );
            }
        }
    }

    if (
        !termo ||
        !termo.documentoHTML
    ) {
        mostrarToast(
            "Não foi possível encontrar o conteúdo do termo."
        );
        return;
    }

    if (!colaboradorSelecionado) {
        colaboradorSelecionado =
            colaboradores.find(
                colaborador =>
                    String(
                        colaborador.id
                    ) ===
                    String(
                        termo.colaboradorId
                    )
            );
    }

    if (!colaboradorSelecionado) {
        mostrarToast(
            "Não foi possível identificar o colaborador do termo."
        );
        return;
    }

    try {
        mostrarToast(
            "Gerando PDF..."
        );

        await carregarBiblioteca(
            "html2canvas",
            "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"
        );

        await carregarBiblioteca(
            "jspdf",
            "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"
        );

        let iframe = null;

        try {
            iframe =
                document.createElement(
                    "iframe"
                );

            iframe.style.position =
                "fixed";

            iframe.style.left =
                "-10000px";

            iframe.style.top =
                "0";

            iframe.style.width =
                "210mm";

            iframe.style.height =
                "1200mm";

            iframe.style.border =
                "0";

            iframe.style.visibility =
                "hidden";

            document.body.appendChild(
                iframe
            );

            const html =
                criarDocumentoTermoHTML(
                    termo,
                    colaboradorSelecionado.nome
                );

            const iframeDocument =
                iframe.contentDocument ||
                iframe.contentWindow.document;

            iframeDocument.open();

            iframeDocument.write(
                html
            );

            iframeDocument.close();


            await esperarCarregamentoIframe(
                iframe
            );

            if (iframeDocument.fonts) {
                await iframeDocument.fonts.ready;
            }

            await esperarImagens(
                iframeDocument
            );

            await new Promise(resolve => {
                requestAnimationFrame(() => {
                    requestAnimationFrame(resolve);
                });
            });

            await new Promise(
                resolve =>
                    setTimeout(resolve, 300)
            );


            const paginas =
                iframeDocument.querySelectorAll(
                    ".document-page"
                );

            if (!paginas.length) {
                throw new Error(
                    "Não foi possível localizar as páginas do termo."
                );
            }

            const {
                jsPDF
            } = window.jspdf;

            const pdf =
                new jsPDF({
                    orientation:
                        "portrait",

                    unit:
                        "mm",

                    format:
                        "a4",

                    compress:
                        true
                });

            const margem =
                12;

            const larguraPagina =
                210;

            const alturaPagina =
                297;

            const larguraConteudo =
                larguraPagina -
                margem * 2;

            const alturaConteudo =
                alturaPagina -
                margem * 2;

            for (
                let i = 0;
                i < paginas.length;
                i++
            ) {
                const pagina =
                    paginas[i];

                const rect =
                    pagina.getBoundingClientRect();

                const canvasPDF =
                    await html2canvas(
                        pagina,
                        {
                            scale:
                                2,

                            useCORS:
                                true,

                            allowTaint:
                                true,

                            backgroundColor:
                                "#ffffff",

                            logging:
                                false,

                            width:
                                Math.round(
                                    rect.width
                                ),

                            height:
                                Math.round(
                                    rect.height
                                ),

                            scrollX:
                                0,

                            scrollY:
                                0,

                            windowWidth:
                                Math.ceil(
                                    rect.width
                                ),

                            windowHeight:
                                Math.ceil(
                                    rect.height
                                )
                        }
                    );

                const imagem =
                    canvasPDF.toDataURL(
                        "image/png"
                    );

                if (i > 0) {
                    pdf.addPage(
                        "a4",
                        "portrait"
                    );
                }

                pdf.addImage(
                    imagem,
                    "JPEG",
                    margem,
                    margem,
                    larguraConteudo,
                    alturaConteudo,
                    undefined,
                    "FAST"
                );
            }

            const nome =
                normalizarNomeArquivo(
                    colaboradorSelecionado.nome
                );

            pdf.save(
                `Termo_Comodato_${nome}.pdf`
            );

            mostrarToast(
                "PDF baixado com sucesso."
            );

        } finally {
            if (
                iframe &&
                iframe.parentNode
            ) {
                iframe.remove();
            }
        }

    } catch (erro) {
        console.error(
            "Erro ao baixar termo:",
            erro
        );

        mostrarToast(
            erro.message ||
            "Não foi possível gerar o PDF."
        );
    }
}

function carregarBiblioteca(
    nome,
    url
) {
    if (
        nome === "html2canvas" &&
        typeof window.html2canvas !==
        "undefined"
    ) {
        return Promise.resolve();
    }

    if (
        nome === "jspdf" &&
        typeof window.jspdf !==
        "undefined"
    ) {
        return Promise.resolve();
    }

    return new Promise(
        (resolve, reject) => {
            const script =
                document.createElement(
                    "script"
                );

            script.src =
                url;

            script.async =
                true;

            script.onload =
                () => resolve();

            script.onerror =
                () =>
                    reject(
                        new Error(
                            `Não foi possível carregar a biblioteca ${nome}.`
                        )
                    );

            document.head.appendChild(
                script
            );
        }
    );
}

function esperarCarregamentoIframe(
    iframe
) {
    return new Promise(
        resolve => {
            const verificar =
                () => {
                    try {
                        const documento =
                            iframe.contentDocument ||
                            iframe.contentWindow.document;

                        if (
                            documento.readyState ===
                            "complete"
                        ) {
                            resolve();
                            return;
                        }
                    } catch (erro) {
                        console.error(
                            erro
                        );
                    }

                    setTimeout(
                        verificar,
                        100
                    );
                };

            verificar();
        }
    );
}

function esperarImagens(
    documento
) {
    const imagens =
        Array.from(
            documento.images
        );

    if (!imagens.length) {
        return Promise.resolve();
    }

    return Promise.all(
        imagens.map(
            imagem => {
                if (
                    imagem.complete
                ) {
                    return Promise.resolve();
                }

                return new Promise(
                    resolve => {
                        imagem.onload =
                            resolve;

                        imagem.onerror =
                            resolve;
                    }
                );
            }
        )
    );
}

function normalizarNomeArquivo(
    nome
) {
    return String(
        nome ||
        "colaborador"
    )
        .normalize(
            "NFD"
        )
        .replace(
            /[\u0300-\u036f]/g,
            ""
        )
        .replace(
            /[^a-zA-Z0-9]+/g,
            "_"
        )
        .replace(
            /^_+|_+$/g,
            ""
        );
}

function formatarDataHora(
    data
) {
    if (!data) {
        return "—";
    }

    const dataObj =
        new Date(data);

    if (
        Number.isNaN(
            dataObj.getTime()
        )
    ) {
        return "—";
    }

    return dataObj.toLocaleString(
        "pt-BR",
        {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit"
        }
    );
}

function escapeHTML(
    valor
) {
    return String(
        valor ?? ""
    )
        .replace(
            /&/g,
            "&amp;"
        )
        .replace(
            /</g,
            "&lt;"
        )
        .replace(
            />/g,
            "&gt;"
        )
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /'/g,
            "&#039;"
        );
}

function escapeAttribute(
    valor
) {
    return String(
        valor ?? ""
    )
        .replace(
            /\\/g,
            "\\\\"
        )
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /'/g,
            "&#039;"
        );
}

function normalizarTexto(
    texto
) {
    return String(
        texto || ""
    )
        .normalize(
            "NFD"
        )
        .replace(
            /[\u0300-\u036f]/g,
            ""
        )
        .trim()
        .toLowerCase();
}

function mostrarToast(
    mensagem
) {
    const toast =
        document.getElementById(
            "toast"
        );

    if (!toast) {
        return;
    }

    toast.textContent =
        mensagem;

    toast.classList.add(
        "show"
    );

    clearTimeout(
        mostrarToast.timer
    );

    mostrarToast.timer =
        setTimeout(
            () => {
                toast.classList.remove(
                    "show"
                );
            },
            3000
        );
}

window.abrirEquipamentos =
    abrirEquipamentos;

window.abrirTermo =
    abrirTermo;

window.excluirTermoAdmin =
    excluirTermoAdmin;

window.visualizarTermoSelecionado =
    visualizarTermoSelecionado;

window.fecharModalEquipamentos =
    fecharModalEquipamentos;

window.fecharModalFora =
    fecharModalFora;

window.fecharModalTermo =
    fecharModalTermo;

window.fecharModalTermoFora =
    fecharModalTermoFora;

window.baixarTermoSelecionado =
    baixarTermoSelecionado;