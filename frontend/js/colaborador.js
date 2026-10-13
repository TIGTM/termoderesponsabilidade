const API_URL = "http://localhost:5268/api";

let colaboradores = [];
let colaboradorSelecionado = null;
let equipamentosSelecionados = [];

document.addEventListener("DOMContentLoaded", async () => {
    await carregarColaboradores();

    configurarBusca();
    configurarMascaras();

    document.getElementById("btnContinuar").addEventListener(
        "click",
        continuarParaTermo
    );

    document.getElementById("btnVisualizarTermo").addEventListener(
        "click",
        visualizarTermo
    );

    document.getElementById("btnBaixarTermo").addEventListener(
        "click",
        baixarTermoAssinado
    );
});

async function visualizarTermo() {
    if (!colaboradorSelecionado) {
        mostrarToast(
            "Nenhum colaborador selecionado.",
            "erro"
        );
        return;
    }

    try {
        const termo = await obterTermoPorColaborador(
            colaboradorSelecionado.id
        );

        if (
            !termo ||
            String(termo.status || "").toLowerCase() !== "assinado" ||
            !termo.documentoHTML
        ) {
            mostrarToast(
                "Termo assinado não encontrado.",
                "erro"
            );

            desbloquearDados();
            return;
        }

        const janela = window.open("", "_blank");

        if (!janela) {
            mostrarToast(
                "O navegador bloqueou a abertura do termo.",
                "erro"
            );
            return;
        }

        const caminhoCSS = new URL(
            "css/style.css",
            window.location.href
        ).href;

        janela.document.open();

        janela.document.write(`
            <!DOCTYPE html>
            <html lang="pt-BR">
            <head>
                <meta charset="UTF-8">
                <meta
                    name="viewport"
                    content="width=device-width, initial-scale=1.0"
                >
                <title>Termo de Responsabilidade</title>
                <link
                    rel="stylesheet"
                    href="${caminhoCSS}"
                >
            </head>
            <body class="termo-body">
                <main class="termo-container">
                    <section class="document-wrapper">
                        ${termo.documentoHTML}
                    </section>
                </main>
            </body>
            </html>
        `);

        janela.document.close();
    } catch (erro) {
        console.error(
            "Erro ao visualizar termo:",
            erro
        );

        mostrarToast(
            "Não foi possível abrir o termo.",
            "erro"
        );
    }
}

async function baixarTermoAssinado() {
    if (!colaboradorSelecionado) {
        mostrarToast(
            "Nenhum colaborador selecionado.",
            "erro"
        );
        return;
    }

    let iframe = null;

    try {
        const termo = await obterTermoPorColaborador(
            colaboradorSelecionado.id
        );

        if (
            !termo ||
            String(termo.status || "").toLowerCase() !== "assinado" ||
            !termo.documentoHTML
        ) {
            mostrarToast(
                "Termo assinado não encontrado.",
                "erro"
            );

            desbloquearDados();
            return;
        }

        if (
            typeof html2canvas === "undefined" ||
            typeof window.jspdf === "undefined"
        ) {
            mostrarToast(
                "As bibliotecas de PDF não foram carregadas.",
                "erro"
            );
            return;
        }

        mostrarToast(
            "Gerando PDF...",
            "info"
        );

        iframe = document.createElement("iframe");

        iframe.style.position = "fixed";
        iframe.style.left = "-10000px";
        iframe.style.top = "0";
        iframe.style.width = "210mm";
        iframe.style.height = "1200mm";
        iframe.style.border = "0";
        iframe.style.visibility = "hidden";

        document.body.appendChild(iframe);

        const iframeDocument =
            iframe.contentDocument ||
            iframe.contentWindow.document;

        const caminhoCSS = new URL(
            "css/style.css",
            window.location.href
        ).href;

        iframeDocument.open();

        iframeDocument.write(`
            <!DOCTYPE html>
            <html lang="pt-BR">
            <head>
                <meta charset="UTF-8">
                <meta
                    name="viewport"
                    content="width=device-width, initial-scale=1.0"
                >
                <link
                    rel="stylesheet"
                    href="${caminhoCSS}"
                >
                <style>
                    html,
                    body {
                        width: 210mm !important;
                        min-width: 210mm !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        background: #ffffff !important;
                        overflow: visible !important;
                    }

                    .termo-body {
                        width: 210mm !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        background: #ffffff !important;
                    }

                    .termo-container {
                        width: 210mm !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        background: #ffffff !important;
                    }

                    .document-wrapper {
                        width: 210mm !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        background: #ffffff !important;
                    }

                    #documento {
                        width: 210mm !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        box-sizing: border-box !important;
                        background: #ffffff !important;
                    }

                    .document-page {
                        display: block !important;
                        width: 210mm !important;
                        height: 297mm !important;
                        min-height: 297mm !important;
                        max-height: 297mm !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        box-sizing: border-box !important;
                        background: #ffffff !important;
                        overflow: hidden !important;
                        page-break-after: avoid !important;
                    }
                </style>
            </head>
            <body class="termo-body">
                <main class="termo-container">
                    <section class="document-wrapper">
                        ${termo.documentoHTML}
                    </section>
                </main>
            </body>
            </html>
        `);

        iframeDocument.close();

        await new Promise(resolve => {
            const verificar = () => {
                if (
                    iframeDocument.readyState ===
                    "complete"
                ) {
                    resolve();
                } else {
                    setTimeout(
                        verificar,
                        100
                    );
                }
            };

            verificar();
        });

        const imagens = Array.from(
            iframeDocument.images
        );

        await Promise.all(
            imagens.map(img => {
                if (img.complete) {
                    return Promise.resolve();
                }

                return new Promise(resolve => {
                    img.onload = resolve;
                    img.onerror = resolve;
                });
            })
        );

        await new Promise(
            resolve =>
                setTimeout(
                    resolve,
                    500
                )
        );

        const paginas =
            iframeDocument.querySelectorAll(
                ".document-page"
            );

        if (!paginas.length) {
            mostrarToast(
                "Não foi possível localizar as páginas do termo.",
                "erro"
            );
            return;
        }

        const { jsPDF } = window.jspdf;

        const pdf = new jsPDF({
            orientation: "portrait",
            unit: "mm",
            format: "a4",
            compress: true
        });

        const margem = 12;
        const larguraPagina = 210;
        const alturaPagina = 297;

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
            const pagina = paginas[i];

            const rect =
                pagina.getBoundingClientRect();

            const canvas =
                await html2canvas(
                    pagina,
                    {
                        scale: 2,
                        useCORS: true,
                        allowTaint: true,
                        backgroundColor: "#ffffff",
                        width: Math.ceil(rect.width),
                        height: Math.ceil(rect.height),
                        windowWidth: Math.ceil(rect.width),
                        windowHeight: Math.ceil(rect.height)
                    }
                );

            const imagem =
                canvas.toDataURL(
                    "image/jpeg",
                    0.95
                );

            if (i > 0) {
                pdf.addPage();
            }

            const proporcao =
                Math.min(
                    larguraConteudo / canvas.width,
                    alturaConteudo / canvas.height
                );

            const largura =
                canvas.width *
                proporcao;

            const altura =
                canvas.height *
                proporcao;

            const x =
                (larguraPagina - largura) /
                2;

            const y =
                (alturaPagina - altura) /
                2;

            pdf.addImage(
                imagem,
                "JPEG",
                x,
                y,
                largura,
                altura,
                undefined,
                "FAST"
            );
        }

        const nome =
            normalizarNomeArquivo(
                `Termo_${colaboradorSelecionado.nomeCompleto || colaboradorSelecionado.nome || "Colaborador"}`
            );

        pdf.save(
            `${nome}.pdf`
        );

        mostrarToast(
            "PDF gerado com sucesso.",
            "sucesso"
        );
    } catch (erro) {
        console.error(
            "Erro ao gerar PDF:",
            erro
        );

        mostrarToast(
            "Não foi possível gerar o PDF.",
            "erro"
        );
    } finally {
        if (iframe) {
            iframe.remove();
        }
    }
}

async function carregarColaboradores() {
    try {
        const resposta = await fetch(
            `${API_URL}/colaboradores`
        );

        if (!resposta.ok) {
            throw new Error(
                "Não foi possível carregar os colaboradores."
            );
        }

        colaboradores = await resposta.json();
    } catch (erro) {
        console.error(
            "Erro ao carregar colaboradores:",
            erro
        );

        mostrarToast(
            "Não foi possível carregar os colaboradores.",
            "erro"
        );
    }
}

function renderizarColaboradores(lista = colaboradores) {
    const listaElement =
        document.getElementById(
            "resultadosColaboradores"
        );

    if (!listaElement) {
        return;
    }

    listaElement.innerHTML = "";

    if (!lista.length) {
        listaElement.classList.remove("show");
        return;
    }

    lista.forEach(colaborador => {
        const item =
            document.createElement("div");

        item.className =
            "autocomplete-item";

        item.dataset.id =
            colaborador.id;

        const nome =
            colaborador.nomeCompleto ||
            colaborador.nome ||
            "Sem nome";

        const email =
            colaborador.email ||
            "Sem e-mail";

        item.innerHTML = `
            <div class="autocomplete-avatar">
                ${nome.charAt(0).toUpperCase()}
            </div>

            <div class="autocomplete-info">
                <strong>${escapeHTML(nome)}</strong>
                <span>${escapeHTML(email)}</span>
            </div>
        `;

        item.addEventListener(
            "click",
            () => {
                selecionarColaborador(
                    colaborador
                );
            }
        );

        listaElement.appendChild(
            item
        );
    });

    listaElement.classList.add("show");
}

async function selecionarColaborador(
    colaborador
) {
    colaboradorSelecionado =
        colaborador;

    const campoBusca =
        document.getElementById(
            "campoBuscaColaborador"
        );

    if (campoBusca) {
        campoBusca.value =
            colaborador.nomeCompleto ||
            colaborador.nome ||
            "";
    }

    const resultados =
        document.getElementById(
            "resultadosColaboradores"
        );

    if (resultados) {
        resultados.classList.remove(
            "show"
        );
    }

    document
        .querySelectorAll(
            ".autocomplete-item"
        )
        .forEach(item => {
            item.classList.toggle(
                "selected",
                Number(
                    item.dataset.id
                ) ===
                Number(
                    colaborador.id
                )
            );
        });

    preencherFormulario(
        colaborador
    );

    try {
        equipamentosSelecionados =
            await obterEquipamentosDoColaborador(
                colaborador
            );
    } catch (erro) {
        console.error(
            "Erro ao carregar equipamentos:",
            erro
        );

        equipamentosSelecionados = [];
    }

    renderizarEquipamentos(
        equipamentosSelecionados
    );

    const possuiTermo =
        await possuiTermoAssinado(
            colaborador.id
        );

    if (possuiTermo) {
        bloquearDadosAssinados();
    } else {
        desbloquearDados();
    }

    const areaColaborador =
        document.getElementById(
            "areaColaborador"
        );

    const estadoVazio =
        document.getElementById(
            "estadoVazio"
        );

    if (areaColaborador) {
        areaColaborador.classList.remove(
            "hidden"
        );
    }

    if (estadoVazio) {
        estadoVazio.classList.add(
            "hidden"
        );
    }
}

function preencherFormulario(
    colaborador
) {
    document.getElementById(
        "nome"
    ).value =
        colaborador.nomeCompleto ||
        colaborador.nome ||
        "";

    document.getElementById(
        "cpf"
    ).value =
        colaborador.cpf ||
        "";

    document.getElementById(
        "cep"
    ).value =
        colaborador.cep ||
        "";

    document.getElementById(
        "rua"
    ).value =
        colaborador.rua ||
        "";

    document.getElementById(
        "numero"
    ).value =
        colaborador.numero ||
        "";

    document.getElementById(
        "bairro"
    ).value =
        colaborador.bairro ||
        "";

    document.getElementById(
        "cidade"
    ).value =
        colaborador.cidade ||
        "";

    document.getElementById(
        "estado"
    ).value =
        colaborador.estado ||
        "";

    document.getElementById(
        "telefone"
    ).value =
        colaborador.telefone ||
        "";
}

async function obterEquipamentosDoColaborador(
    colaborador
) {
    const resposta =
        await fetch(
            `${API_URL}/equipamentos`
        );

    if (!resposta.ok) {
        throw new Error(
            "Não foi possível carregar os equipamentos."
        );
    }

    const equipamentos =
        await resposta.json();

    const porId =
        equipamentos.filter(
            equipamento =>
                Number(
                    equipamento.responsavelId
                ) ===
                Number(
                    colaborador.id
                )
        );

    if (porId.length) {
        return porId;
    }

    const nomeNormalizado =
        normalizarTexto(
            colaborador.nomeCompleto ||
            colaborador.nome
        );

    return equipamentos.filter(
        equipamento =>
            normalizarTexto(
                equipamento.responsavel
            ) ===
            nomeNormalizado
    );
}

function renderizarEquipamentos(
    equipamentos
) {
    const lista =
        document.getElementById(
            "listaEquipamentos"
        );

    const quantidade =
        document.getElementById(
            "quantidadeEquipamentos"
        );

    if (!lista) {
        return;
    }

    lista.innerHTML = "";

    if (quantidade) {
        quantidade.textContent =
            `${equipamentos.length} equipamento${equipamentos.length === 1 ? "" : "s"}`;
    }

    if (!equipamentos.length) {
        lista.innerHTML = `
            <div class="empty-equipment">
                <strong>Nenhum equipamento encontrado.</strong>
                <span>Não há equipamentos vinculados a este colaborador.</span>
            </div>
        `;
        return;
    }

    equipamentos.forEach(equipamento => {
        const card =
            document.createElement("div");

        card.className =
            "equipment-card";

        const titulo =
            equipamento.tipo ||
            equipamento.categoria ||
            "Equipamento";

        const identificacao =
            equipamento.patrimonio ||
            equipamento.serial ||
            "Sem identificação";

        const status =
            equipamento.status ||
            "Sem status";

        card.innerHTML = `
            <div class="equipment-icon">
                ${obterIconeEquipamento(equipamento)}
            </div>

            <div class="equipment-main">
                <div class="equipment-title-row">
                    <div>
                        <span class="equipment-category">
                            ${escapeHTML(titulo)}
                        </span>

                        <h3>
                            ${escapeHTML(identificacao)}
                        </h3>
                    </div>

                    <span class="equipment-status">
                        ${escapeHTML(status)}
                    </span>
                </div>

                <div class="equipment-details">
                    <div class="equipment-detail">
                        <span>Marca</span>
                        <strong>
                            ${escapeHTML(equipamento.marca || "-")}
                        </strong>
                    </div>

                    <div class="equipment-detail">
                        <span>Modelo</span>
                        <strong>
                            ${escapeHTML(equipamento.modelo || "-")}
                        </strong>
                    </div>

                    <div class="equipment-detail">
                        <span>Número de série</span>
                        <strong>
                            ${escapeHTML(equipamento.serial || "-")}
                        </strong>
                    </div>

                    <div class="equipment-detail">
                        <span>Local</span>
                        <strong>
                            ${escapeHTML(equipamento.local || "-")}
                        </strong>
                    </div>
                </div>
            </div>
        `;

        lista.appendChild(
            card
        );
    });
}

function obterIconeEquipamento(
    equipamento
) {
    const tipo =
        normalizarTexto(
            equipamento.tipo ||
            equipamento.categoria ||
            ""
        );

    if (
        tipo.includes("notebook") ||
        tipo.includes("desktop") ||
        tipo.includes("computador")
    ) {
        return "PC";
    }

    if (
        tipo.includes("celular") ||
        tipo.includes("telefone") ||
        tipo.includes("smartphone")
    ) {
        return "TEL";
    }

    if (
        tipo.includes("tablet")
    ) {
        return "TAB";
    }

    return "TI";
}

function configurarBusca() {
    const campo =
        document.getElementById(
            "campoBuscaColaborador"
        );

    if (!campo) {
        return;
    }

    campo.addEventListener(
        "input",
        () => {
            const busca =
                normalizarTexto(
                    campo.value
                );

            const resultados =
                document.getElementById(
                    "resultadosColaboradores"
                );

            if (!busca) {
                if (resultados) {
                    resultados.innerHTML = "";
                    resultados.classList.remove(
                        "show"
                    );
                }

                return;
            }

            const filtrados =
                colaboradores.filter(
                    colaborador =>
                        normalizarTexto(
                            colaborador.nomeCompleto ||
                            colaborador.nome
                        ).includes(
                            busca
                        ) ||
                        normalizarTexto(
                            colaborador.email
                        ).includes(
                            busca
                        ) ||
                        normalizarTexto(
                            colaborador.cpf
                        ).includes(
                            busca
                        )
                );

            renderizarColaboradores(
                filtrados
            );
        }
    );
}

function configurarMascaras() {
    const cpf =
        document.getElementById(
            "cpf"
        );

    if (cpf) {
        cpf.addEventListener(
            "input",
            () => {
                let valor =
                    cpf.value
                        .replace(
                            /\D/g,
                            ""
                        )
                        .slice(
                            0,
                            11
                        );

                if (valor.length > 9) {
                    valor =
                        valor.replace(
                            /^(\d{3})(\d{3})(\d{3})(\d{1,2})$/,
                            "$1.$2.$3-$4"
                        );
                } else if (
                    valor.length > 6
                ) {
                    valor =
                        valor.replace(
                            /^(\d{3})(\d{3})(\d{1,3})$/,
                            "$1.$2.$3"
                        );
                } else if (
                    valor.length > 3
                ) {
                    valor =
                        valor.replace(
                            /^(\d{3})(\d{1,3})$/,
                            "$1.$2"
                        );
                }

                cpf.value =
                    valor;
            }
        );
    }

    const cep =
        document.getElementById(
            "cep"
        );

    if (cep) {
        cep.addEventListener(
            "input",
            () => {
                let valor =
                    cep.value
                        .replace(
                            /\D/g,
                            ""
                        )
                        .slice(
                            0,
                            8
                        );

                if (valor.length > 5) {
                    valor =
                        valor.replace(
                            /^(\d{5})(\d{1,3})$/,
                            "$1-$2"
                        );
                }

                cep.value =
                    valor;
            }
        );
    }

    const telefone =
        document.getElementById(
            "telefone"
        );

    if (telefone) {
        telefone.addEventListener(
            "input",
            () => {
                let valor =
                    telefone.value
                        .replace(
                            /\D/g,
                            ""
                        )
                        .slice(
                            0,
                            11
                        );

                if (valor.length > 10) {
                    valor =
                        valor.replace(
                            /^(\d{2})(\d{5})(\d{4})$/,
                            "($1) $2-$3"
                        );
                } else if (
                    valor.length > 6
                ) {
                    valor =
                        valor.replace(
                            /^(\d{2})(\d{4,5})(\d{0,4})$/,
                            "($1) $2-$3"
                        );
                } else if (
                    valor.length > 2
                ) {
                    valor =
                        valor.replace(
                            /^(\d{2})(\d+)$/,
                            "($1) $2"
                        );
                }

                telefone.value =
                    valor;
            }
        );
    }
}

function validarFormulario() {
    const dados =
        coletarDadosFormulario();

    if (!dados.nome) {
        mostrarToast(
            "Informe o nome completo.",
            "erro"
        );

        document
            .getElementById(
                "nome"
            )
            .focus();

        return false;
    }

    if (!validarCPF(dados.cpf)) {
        mostrarToast(
            "Informe um CPF válido.",
            "erro"
        );

        document
            .getElementById(
                "cpf"
            )
            .focus();

        return false;
    }

    if (!validarCEP(dados.cep)) {
        mostrarToast(
            "Informe um CEP válido.",
            "erro"
        );

        document
            .getElementById(
                "cep"
            )
            .focus();

        return false;
    }

    return true;
}

async function continuarParaTermo() {
    if (!colaboradorSelecionado) {
        mostrarToast(
            "Selecione um colaborador primeiro.",
            "erro"
        );

        return;
    }

    if (!validarFormulario()) {
        return;
    }

    if (!colaboradorSelecionado.id) {
        mostrarToast(
            "Não foi possível identificar o colaborador.",
            "erro"
        );

        return;
    }

    const dados =
        coletarDadosFormulario();

    const colaboradorAtualizado = {
        id:
            colaboradorSelecionado.id,

        nome:
            colaboradorSelecionado.nome ||
            "",

        nomeCompleto:
            dados.nome,

        cpf:
            dados.cpf,

        cep:
            dados.cep,

        rua:
            dados.rua,

        numero:
            dados.numero,

        bairro:
            dados.bairro,

        cidade:
            dados.cidade,

        estado:
            dados.estado,

        telefone:
            dados.telefone,

        email:
            colaboradorSelecionado.email ||
            ""
    };

    try {
        const resposta =
            await fetch(
                `${API_URL}/colaboradores/${colaboradorSelecionado.id}`,
                {
                    method: "PUT",
                    headers: {
                        "Content-Type":
                            "application/json"
                    },
                    body:
                        JSON.stringify(
                            colaboradorAtualizado
                        )
                }
            );

        if (!resposta.ok) {
            const erro =
                await resposta.text();

            throw new Error(
                erro ||
                "Não foi possível atualizar o colaborador."
            );
        }

        colaboradorSelecionado =
            colaboradorAtualizado;

        const indice =
            colaboradores.findIndex(
                colaborador =>
                    Number(
                        colaborador.id
                    ) ===
                    Number(
                        colaboradorAtualizado.id
                    )
            );

        if (indice !== -1) {
            colaboradores[indice] =
                colaboradorAtualizado;
        }

        sessionStorage.setItem(
            "colaboradorTermo",
            JSON.stringify({
                colaborador:
                    colaboradorAtualizado,
                equipamentos:
                    equipamentosSelecionados
            })
        );

        mostrarToast(
            "Dados confirmados. A próxima etapa será o termo.",
            "sucesso"
        );

        setTimeout(
            () => {
                window.location.href =
                    "termo.html";
            },
            500
        );
    } catch (erro) {
        console.error(
            "Erro ao atualizar colaborador:",
            erro
        );

        mostrarToast(
            "Não foi possível salvar os dados do colaborador.",
            "erro"
        );
    }
}

function coletarDadosFormulario() {
    return {
        nome:
            document
                .getElementById(
                    "nome"
                )
                .value
                .trim(),

        cpf:
            document
                .getElementById(
                    "cpf"
                )
                .value
                .trim(),

        cep:
            document
                .getElementById(
                    "cep"
                )
                .value
                .trim(),

        rua:
            document
                .getElementById(
                    "rua"
                )
                .value
                .trim(),

        numero:
            document
                .getElementById(
                    "numero"
                )
                .value
                .trim(),

        bairro:
            document
                .getElementById(
                    "bairro"
                )
                .value
                .trim(),

        cidade:
            document
                .getElementById(
                    "cidade"
                )
                .value
                .trim(),

        estado:
            document
                .getElementById(
                    "estado"
                )
                .value
                .trim(),

        telefone:
            document
                .getElementById(
                    "telefone"
                )
                .value
                .trim()
    };
}

async function obterTermoPorColaborador(
    colaboradorId
) {
    const resposta =
        await fetch(
            `${API_URL}/termos/colaborador/${colaboradorId}`
        );

    if (resposta.status === 404) {
        return null;
    }

    if (!resposta.ok) {
        throw new Error(
            "Não foi possível carregar o termo."
        );
    }

    return await resposta.json();
}

async function possuiTermoAssinado(
    id
) {
    try {
        const termo =
            await obterTermoPorColaborador(
                id
            );

        return !!(
            termo &&
            String(
                termo.status || ""
            ).toLowerCase() ===
            "assinado"
        );
    } catch (erro) {
        console.error(
            "Erro ao verificar termo:",
            erro
        );

        return false;
    }
}

function bloquearDadosAssinados() {
    const campos = [
        "cpf",
        "cep",
        "rua",
        "numero",
        "bairro",
        "cidade",
        "estado",
        "telefone"
    ];

    campos.forEach(
        id => {
            const campo =
                document.getElementById(
                    id
                );

            if (campo) {
                campo.disabled =
                    true;
            }
        }
    );

    const botao =
        document.getElementById(
            "btnContinuar"
        );

    if (botao) {
        botao.textContent =
            "Termo já assinado";

        botao.disabled =
            true;
    }

    const visualizar =
        document.getElementById(
            "btnVisualizarTermo"
        );

    if (visualizar) {
        visualizar.classList.remove(
            "hidden"
        );
    }

    const baixar =
        document.getElementById(
            "btnBaixarTermo"
        );

    if (baixar) {
        baixar.classList.remove(
            "hidden"
        );
    }
}

function desbloquearDados() {
    const campos = [
        "cpf",
        "cep",
        "rua",
        "numero",
        "bairro",
        "cidade",
        "estado",
        "telefone"
    ];

    campos.forEach(
        id => {
            const campo =
                document.getElementById(
                    id
                );

            if (campo) {
                campo.disabled =
                    false;
            }
        }
    );

    const botao =
        document.getElementById(
            "btnContinuar"
        );

    if (botao) {
        botao.textContent =
            "Continuar para o termo";

        botao.disabled =
            false;
    }

    const visualizar =
        document.getElementById(
            "btnVisualizarTermo"
        );

    if (visualizar) {
        visualizar.classList.add(
            "hidden"
        );
    }

    const baixar =
        document.getElementById(
            "btnBaixarTermo"
        );

    if (baixar) {
        baixar.classList.add(
            "hidden"
        );
    }
}

function validarCPF(cpf) {
    const valor =
        cpf.replace(
            /\D/g,
            ""
        );

    if (valor.length !== 11) {
        return false;
    }

    if (/^(\d)\1{10}$/.test(valor)) {
        return false;
    }

    let soma = 0;

    for (
        let i = 0;
        i < 9;
        i++
    ) {
        soma +=
            Number(
                valor.charAt(i)
            ) *
            (10 - i);
    }

    let resto =
        (soma * 10) %
        11;

    if (resto === 10) {
        resto = 0;
    }

    if (
        resto !==
        Number(
            valor.charAt(9)
        )
    ) {
        return false;
    }

    soma = 0;

    for (
        let i = 0;
        i < 10;
        i++
    ) {
        soma +=
            Number(
                valor.charAt(i)
            ) *
            (11 - i);
    }

    resto =
        (soma * 10) %
        11;

    if (resto === 10) {
        resto = 0;
    }

    return (
        resto ===
        Number(
            valor.charAt(10)
        )
    );
}

function validarCEP(cep) {
    const valor =
        cep.replace(
            /\D/g,
            ""
        );

    return (
        valor.length ===
        8
    );
}

function obterInicial(nome) {
    if (!nome) {
        return "?";
    }

    return nome
        .trim()
        .charAt(0)
        .toUpperCase();
}

function normalizarTexto(texto) {
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
        .toLowerCase()
        .trim();
}

function escapeHTML(valor) {
    return String(
        valor || ""
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

function normalizarNomeArquivo(
    nome
) {
    return normalizarTexto(
        nome
    )
        .replace(
            /[^a-z0-9]+/g,
            "_"
        )
        .replace(
            /^_+|_+$/g,
            ""
        );
}

function mostrarToast(
    mensagem,
    tipo = "info"
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

    toast.className =
        `toast show ${tipo}`;

    setTimeout(
        () => {
            toast.className =
                "toast";
        },
        3500
    );
}