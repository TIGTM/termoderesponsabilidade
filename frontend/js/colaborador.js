
const API_URL = "/api";

let colaboradores = [];
let colaboradorSelecionado = null;
let equipamentosSelecionados = [];

document.addEventListener("DOMContentLoaded", async () => {
    await carregarSessaoColaborador();
    configurarMascaras();

    document.getElementById("tentarNovamente")?.addEventListener("click", carregarSessaoColaborador);
    document.getElementById("sairColaborador")?.addEventListener("click", async () => {
        try {
            const resposta = await fetch(`${API_URL}/colaborador-auth/logout`, { method: "POST", credentials: "include" });
            if (!resposta.ok && resposta.status !== 401) throw new Error();
            sessionStorage.removeItem("colaboradorTermo");
            window.location.href = "login.html?perfil=colaborador";
        } catch { mostrarToast("Não foi possível sair. Tente novamente.", "erro"); }
    });

    document.getElementById("btnContinuar")?.addEventListener(
        "click",
        continuarParaTermo
    );

    document.getElementById("btnVisualizarTermo")?.addEventListener(
        "click",
        visualizarTermo
    );

    document.getElementById("btnBaixarTermo")?.addEventListener(
        "click",
        baixarTermoAssinado
    );
});


function preencherFormulario(colaborador) {
    const campos = {
        nome: colaborador.nomeCompleto || colaborador.nome || "",
        cpf: colaborador.cpf || "",
        cep: colaborador.cep || "",
        rua: colaborador.rua || "",
        numero: colaborador.numero || "",
        bairro: colaborador.bairro || "",
        cidade: colaborador.cidade || "",
        estado: colaborador.estado || "",
        telefone: colaborador.telefone || ""
    };

    Object.entries(campos).forEach(([id, valor]) => {
        const campo = document.getElementById(id);
        if (campo) campo.value = valor;
    });
}


async function carregarSessaoColaborador() {
    const erro = document.getElementById("erroCarregamento");
    const retry = document.getElementById("tentarNovamente");
    erro.textContent = "";
    retry.classList.add("hidden");
    try {
        const resposta = await fetch(`${API_URL}/colaborador-auth/me`, { credentials: "include", cache: "no-store" });
        if (resposta.status === 401) {
            sessionStorage.removeItem("colaboradorTermo");
            window.location.replace("login.html?perfil=colaborador");
            return;
        }
        if (!resposta.ok) throw new Error("Não foi possível carregar seu cadastro.");
        const sessao = await resposta.json();
        colaboradorSelecionado = sessao.colaborador;
        preencherFormulario(colaboradorSelecionado);
        equipamentosSelecionados = await obterEquipamentosDoColaborador(colaboradorSelecionado);
        renderizarEquipamentos(equipamentosSelecionados);
        if (await possuiTermoAssinado(colaboradorSelecionado.id)) bloquearDadosAssinados();
        else desbloquearDados();
        document.getElementById("areaColaborador").classList.remove("hidden");
        document.getElementById("estadoVazio").classList.add("hidden");
    } catch (falha) {
        erro.textContent = falha.message || "Não foi possível carregar. Tente novamente.";
        retry.classList.remove("hidden");
    }
}

async function obterEquipamentosDoColaborador(colaborador) {
    const resposta = await fetch(`${API_URL}/equipamentos`, {
        method: "GET",
        credentials: "include"
    });

    if (!resposta.ok) {
        const detalhe = await resposta.text().catch(() => "");
        throw new Error(
            `Não foi possível carregar os equipamentos (${resposta.status}). ${detalhe}`
        );
    }

    const equipamentos = await resposta.json();

    if (!Array.isArray(equipamentos)) {
        throw new Error("A API retornou uma lista de equipamentos inválida.");
    }


    return equipamentos;
}

function renderizarEquipamentos(equipamentos) {
    const lista = document.getElementById("listaEquipamentos");
    const quantidade = document.getElementById("quantidadeEquipamentos");

    if (!lista) return;

    lista.innerHTML = "";

    if (quantidade) {
        quantidade.textContent =
            `${equipamentos.length} equipamento${equipamentos.length === 1 ? "" : "s"}`;
    }

    if (!equipamentos.length) {
        lista.innerHTML = `
            <div class="empty-equipment">
                <strong>Nenhum equipamento encontrado.</strong>
                <span>Não há equipamentos disponíveis ou vinculados para exibição.</span>
            </div>
        `;
        return;
    }

    equipamentos.forEach(equipamento => {
        const card = document.createElement("div");
        card.className = "equipment-card";

        const titulo = equipamento.tipo || equipamento.categoria || "Equipamento";
        const identificacao =
            equipamento.patrimonio || equipamento.serial || "Sem identificação";
        const status = equipamento.status || "Sem status";

        card.innerHTML = `
            <div class="equipment-icon">
                ${escapeHTML(obterIconeEquipamento(equipamento))}
            </div>

            <div class="equipment-main">
                <div class="equipment-title-row">
                    <div>
                        <span class="equipment-category">
                            ${escapeHTML(titulo)}
                        </span>
                        <h3>${escapeHTML(identificacao)}</h3>
                    </div>

                    <span class="equipment-status">
                        ${escapeHTML(status)}
                    </span>
                </div>

                <div class="equipment-details">
                    <div class="equipment-detail">
                        <span>Marca</span>
                        <strong>${escapeHTML(equipamento.marca || "-")}</strong>
                    </div>

                    <div class="equipment-detail">
                        <span>Modelo</span>
                        <strong>${escapeHTML(equipamento.modelo || "-")}</strong>
                    </div>

                    <div class="equipment-detail">
                        <span>Número de série</span>
                        <strong>${escapeHTML(equipamento.serial || "-")}</strong>
                    </div>

                    <div class="equipment-detail">
                        <span>Local</span>
                        <strong>${escapeHTML(equipamento.local || "-")}</strong>
                    </div>
                </div>
            </div>
        `;

        lista.appendChild(card);
    });
}

function obterIconeEquipamento(equipamento) {
    const tipo = normalizarTexto(
        equipamento.tipo || equipamento.categoria || ""
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

    if (tipo.includes("tablet")) return "TAB";

    return "TI";
}




async function continuarParaTermo() {
    if (!colaboradorSelecionado) {
        mostrarToast("Selecione um colaborador primeiro.", "erro");
        return;
    }

    if (!validarFormulario()) return;

    if (!colaboradorSelecionado.id) {
        mostrarToast("Não foi possível identificar o colaborador.", "erro");
        return;
    }

    const dados = coletarDadosFormulario();
    const documentoNumeros = dados.cpf.replace(/\D/g, "");
    const tipoTermo = documentoNumeros.length === 14 ? "CNPJ" : "CPF";
    const documentoFormatado = dados.cpf;

    const cpfParaSalvar = tipoTermo === "CPF"
        ? documentoFormatado
        : (colaboradorSelecionado.cpf || "");

    const colaboradorAtualizado = {
        id: colaboradorSelecionado.id,
        nome: colaboradorSelecionado.nome || "",
        nomeCompleto: dados.nome,
        cpf: cpfParaSalvar,
        cep: dados.cep,
        rua: dados.rua,
        numero: dados.numero,
        bairro: dados.bairro,
        cidade: dados.cidade,
        estado: dados.estado,
        telefone: dados.telefone,
        email: colaboradorSelecionado.email || ""
    };

    const botao = document.getElementById("btnContinuar");

    if (botao) botao.disabled = true;

    try {
        const resposta = await fetch(
            `${API_URL}/colaboradores/${colaboradorSelecionado.id}`,
            {
                method: "PUT",
                credentials: "include",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(colaboradorAtualizado)
            }
        );

        if (!resposta.ok) {
            const erro = await resposta.text().catch(() => "");
            console.error(
                "Falha na atualização do colaborador:",
                resposta.status,
                erro
            );

            throw new Error(
                `Não foi possível atualizar o colaborador (HTTP ${resposta.status}).`
            );
        }

        colaboradorSelecionado = {
            ...colaboradorSelecionado,
            ...colaboradorAtualizado
        };

        const indice = colaboradores.findIndex(
            colaborador =>
                Number(colaborador.id) ===
                Number(colaboradorAtualizado.id)
        );

        if (indice !== -1) {
            colaboradores[indice] = {
                ...colaboradores[indice],
                ...colaboradorAtualizado
            };
        }

        sessionStorage.setItem(
            "colaboradorTermo",
            JSON.stringify({
                colaborador: colaboradorSelecionado,
                equipamentos: equipamentosSelecionados,
                tipoTermo,
                documentoInformado: documentoFormatado
            })
        );

        mostrarToast(
            "Dados confirmados. Abrindo o termo...",
            "sucesso"
        );

        setTimeout(() => {
            window.location.href = tipoTermo === "CNPJ"
                ? "termo-cnpj.html"
                : "termo.html";
        }, 500);

    } catch (erro) {
        console.error("Erro ao atualizar colaborador:", erro);

        mostrarToast(
            erro.message || "Não foi possível salvar os dados do colaborador.",
            "erro"
        );
    } finally {
        if (botao) botao.disabled = false;
    }
}


function coletarDadosFormulario() {
    const obterValor = id =>
        document.getElementById(id)?.value.trim() || "";

    return {
        nome: obterValor("nome"),
        cpf: obterValor("cpf"),
        cep: obterValor("cep"),
        rua: obterValor("rua"),
        numero: obterValor("numero"),
        bairro: obterValor("bairro"),
        cidade: obterValor("cidade"),
        estado: obterValor("estado"),
        telefone: obterValor("telefone")
    };
}

function validarFormulario() {
    const dados = coletarDadosFormulario();
    const documento = dados.cpf.replace(/\D/g, "");

    if (!dados.nome) {
        mostrarToast("Informe o nome completo.", "erro");
        document.getElementById("nome")?.focus();
        return false;
    }

    if (documento.length === 11) {
        if (!validarCPF(documento)) {
            mostrarToast("Informe um CPF válido.", "erro");
            document.getElementById("cpf")?.focus();
            return false;
        }
    } else if (documento.length === 14) {
        if (!validarCNPJ(documento)) {
            mostrarToast("Informe um CNPJ válido.", "erro");
            document.getElementById("cpf")?.focus();
            return false;
        }
    } else {
        mostrarToast("Informe um CPF ou CNPJ válido.", "erro");
        document.getElementById("cpf")?.focus();
        return false;
    }

    if (!validarCEP(dados.cep)) {
        mostrarToast("Informe um CEP válido.", "erro");
        document.getElementById("cep")?.focus();
        return false;
    }

    return true;
}

function validarCNPJ(cnpj) {
    const valor = String(cnpj || "").replace(/\D/g, "");

    if (valor.length !== 14 || /^(\d)\1{13}$/.test(valor)) {
        return false;
    }

    const calcularDigito = (base, pesos) => {
        const soma = base
            .split("")
            .reduce((total, numero, indice) => {
                return total + Number(numero) * pesos[indice];
            }, 0);

        const resto = soma % 11;
        return resto < 2 ? 0 : 11 - resto;
    };

    const primeiroDigito = calcularDigito(
        valor.substring(0, 12),
        [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
    );

    if (primeiroDigito !== Number(valor[12])) {
        return false;
    }

    const segundoDigito = calcularDigito(
        valor.substring(0, 13),
        [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
    );

    return segundoDigito === Number(valor[13]);
}



async function obterTermoPorColaborador(colaboradorId) {
    const resposta = await fetch(
        `${API_URL}/termos/por-colaborador/${colaboradorId}`,
        {
            method: "GET",
            credentials: "include"
        }
    );

    if (resposta.status === 404) {
        return null;
    }

    if (!resposta.ok) {
        const detalhe = await resposta.text().catch(() => "");
        throw new Error(
            `Não foi possível carregar o termo (HTTP ${resposta.status}). ${detalhe}`
        );
    }

    return await resposta.json();
}

async function possuiTermoAssinado(id) {
    try {
        const termo = await obterTermoPorColaborador(id);

        return Boolean(
            termo &&
            String(termo.status || "").toLowerCase() === "assinado"
        );
    } catch (erro) {
        console.error("Erro ao verificar termo:", erro);
        return false;
    }
}

function bloquearDadosAssinados() {
    const campos = [
        "cpf", "cep", "rua", "numero",
        "bairro", "cidade", "estado", "telefone"
    ];

    campos.forEach(id => {
        const campo = document.getElementById(id);
        if (campo) campo.disabled = true;
    });

    const botao = document.getElementById("btnContinuar");

    if (botao) {
        botao.textContent = "Termo já assinado";
        botao.disabled = true;
    }

    document.getElementById("btnVisualizarTermo")
        ?.classList.remove("hidden");

    document.getElementById("btnBaixarTermo")
        ?.classList.remove("hidden");
}

function desbloquearDados() {
    const campos = [
        "cpf", "cep", "rua", "numero",
        "bairro", "cidade", "estado", "telefone"
    ];

    campos.forEach(id => {
        const campo = document.getElementById(id);
        if (campo) campo.disabled = false;
    });

    const botao = document.getElementById("btnContinuar");

    if (botao) {
        botao.textContent = "Continuar para o termo";
        botao.disabled = false;
    }

    document.getElementById("btnVisualizarTermo")
        ?.classList.add("hidden");

    document.getElementById("btnBaixarTermo")
        ?.classList.add("hidden");
}


async function visualizarTermo() {
    if (!colaboradorSelecionado) {
        mostrarToast("Nenhum colaborador selecionado.", "erro");
        return;
    }

    let janela = null;

    try {
        const termoResumo = await obterTermoPorColaborador(
            colaboradorSelecionado.id
        );

        if (
            !termoResumo ||
            String(termoResumo.status || "").toLowerCase() !== "assinado"
        ) {
            mostrarToast("Termo assinado não encontrado.", "erro");
            desbloquearDados();
            return;
        }

        janela = window.open("", "_blank");

        if (!janela) {
            mostrarToast("O navegador bloqueou a abertura do termo.", "erro");
            return;
        }

        janela.document.write(
            "<!DOCTYPE html><html lang='pt-BR'><head><meta charset='UTF-8'><title>Carregando termo...</title></head><body>Carregando termo assinado...</body></html>"
        );

        const resposta = await fetch(
            `/api/termos/${termoResumo.id}`,
            {
                method: "GET",
                credentials: "include",
                cache: "no-store"
            }
        );

        if (!resposta.ok) {
            throw new Error(
                `Não foi possível carregar o documento completo. HTTP ${resposta.status}.`
            );
        }

        const termoCompleto = await resposta.json();

        if (!termoCompleto || !termoCompleto.documentoHTML) {
            throw new Error(
                "A API encontrou o termo, mas não retornou o documento original."
            );
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
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Termo de Responsabilidade</title>
                <link rel="stylesheet" href="${caminhoCSS}">
            </head>
            <body class="termo-body">
                <main class="termo-container">
                    <section class="document-wrapper">
                        ${termoCompleto.documentoHTML}
                    </section>
                </main>
            </body>
            </html>
        `);

        janela.document.close();

    } catch (erro) {
        console.error("Erro ao visualizar termo:", erro);

        if (janela && !janela.closed) {
            janela.close();
        }

        mostrarToast(
            erro.message || "Não foi possível abrir o termo.",
            "erro"
        );
    }
}



async function baixarTermoAssinado() {
    if (!colaboradorSelecionado) {
        mostrarToast("Nenhum colaborador selecionado.", "erro");
        return;
    }

    let iframe = null;

    try {
        mostrarToast("Buscando termo assinado...", "info");


        const resumo = await obterTermoPorColaborador(
            colaboradorSelecionado.id
        );

        if (
            !resumo ||
            String(resumo.status || "").toLowerCase() !== "assinado"
        ) {
            mostrarToast("Termo assinado não encontrado.", "erro");
            return;
        }


        const resposta = await fetch(
            `${API_URL}/termos/${resumo.id}`,
            {
                method: "GET",
                credentials: "include",
                headers: {
                    "Accept": "application/json"
                }
            }
        );

        if (!resposta.ok) {
            throw new Error(
                `Falha ao buscar o documento. HTTP ${resposta.status}`
            );
        }

        const termo = await resposta.json();

        if (
            !termo ||
            String(termo.status || "").toLowerCase() !== "assinado" ||
            !termo.documentoHTML
        ) {
            mostrarToast("O documento assinado não possui conteúdo.", "erro");
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

        mostrarToast("Preparando documento para PDF...", "info");

        iframe = document.createElement("iframe");

        iframe.style.position = "fixed";
        iframe.style.left = "-10000px";
        iframe.style.top = "0";
        iframe.style.width = "794px";
        iframe.style.height = "1200px";
        iframe.style.border = "0";
        iframe.style.visibility = "hidden";

        document.body.appendChild(iframe);

        const iframeDocument =
            iframe.contentDocument || iframe.contentWindow.document;

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
                <meta name="viewport"
                      content="width=device-width, initial-scale=1.0">

                <link rel="stylesheet" href="${caminhoCSS}">

                <style>
                    html, body {
                        margin: 0 !important;
                        padding: 0 !important;
                        width: 794px !important;
                        min-width: 794px !important;
                        background: #fff !important;
                        overflow: visible !important;
                    }

                    body.termo-body,
                    .termo-container,
                    .document-wrapper {
                        width: 794px !important;
                        min-width: 794px !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        background: #fff !important;
                    }

                    #documento {
                        width: 794px !important;
                        margin: 0 !important;
                        background: #fff !important;
                    }

                    .document-page {
                        display: block !important;
                        position: relative !important;
                        width: 794px !important;
                        height: 1123px !important;
                        min-height: 1123px !important;
                        max-height: 1123px !important;
                        margin: 0 !important;
                        box-sizing: border-box !important;
                        background: #fff !important;
                        overflow: hidden !important;
                        page-break-after: auto !important;
                        break-after: auto !important;
                    }

                    img {
                        max-width: 100%;
                    }

                    *, *::before, *::after {
                        animation: none !important;
                        transition: none !important;
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


        await new Promise((resolve, reject) => {
            const inicio = Date.now();

            function verificar() {
                if (iframeDocument.readyState === "complete") {
                    resolve();
                    return;
                }

                if (Date.now() - inicio > 10000) {
                    reject(new Error(
                        "Tempo esgotado ao carregar o documento."
                    ));
                    return;
                }

                setTimeout(verificar, 100);
            }

            verificar();
        });


        if (iframeDocument.fonts && iframeDocument.fonts.ready) {
            await iframeDocument.fonts.ready;
        }


        await Promise.all(
            Array.from(iframeDocument.images).map(img => {
                if (img.complete) {
                    return Promise.resolve();
                }

                return new Promise(resolve => {
                    img.onload = resolve;
                    img.onerror = resolve;

                    setTimeout(resolve, 5000);
                });
            })
        );


        await new Promise(resolve => {
            iframe.contentWindow.requestAnimationFrame(() => {
                iframe.contentWindow.requestAnimationFrame(resolve);
            });
        });

        const paginas = iframeDocument.querySelectorAll(".document-page");

        if (!paginas.length) {
            throw new Error(
                "Nenhuma página .document-page foi encontrada no HTML."
            );
        }

        mostrarToast("Gerando PDF...", "info");

        const { jsPDF } = window.jspdf;

        const pdf = new jsPDF({
            orientation: "portrait",
            unit: "mm",
            format: "a4",
            compress: true
        });

        const larguraPagina = 210;
        const alturaPagina = 297;
        const margem = 10;
        const larguraConteudo = larguraPagina - margem * 2;
        const alturaConteudo = alturaPagina - margem * 2;

        for (let i = 0; i < paginas.length; i++) {
            const pagina = paginas[i];

            const canvas = await html2canvas(pagina, {
                scale: 2,
                useCORS: true,
                allowTaint: false,
                backgroundColor: "#ffffff",
                logging: false,
                width: 794,
                height: 1123,
                windowWidth: 794,
                windowHeight: 1123,
                scrollX: 0,
                scrollY: 0
            });

            const imagem = canvas.toDataURL("image/png");

            if (i > 0) {
                pdf.addPage();
            }

            const proporcao = Math.min(
                larguraConteudo / canvas.width,
                alturaConteudo / canvas.height
            );

            const largura = canvas.width * proporcao;
            const altura = canvas.height * proporcao;

            const x = (larguraPagina - largura) / 2;
            const y = (alturaPagina - altura) / 2;

            pdf.addImage(
                imagem,
                "PNG",
                x,
                y,
                largura,
                altura,
                undefined,
                "FAST"
            );
        }

        const nome = normalizarNomeArquivo(
            `Termo_${colaboradorSelecionado.nomeCompleto ||
            colaboradorSelecionado.nome ||
            "Colaborador"
            }`
        );

        pdf.save(`${nome || "Termo_Colaborador"}.pdf`);

        mostrarToast("PDF gerado com sucesso.", "sucesso");

    } catch (erro) {
        console.error("Erro ao gerar PDF:", erro);

        mostrarToast(
            "Não foi possível gerar o PDF. Verifique o console.",
            "erro"
        );
    } finally {
        if (iframe) {
            iframe.remove();
        }
    }
}


function configurarMascaras() {

    const cpf = document.getElementById("cpf");

    if (cpf) {
        cpf.addEventListener("input", () => {
            const numeros = cpf.value
                .replace(/\D/g, "")
                .slice(0, 14);

            let valor = numeros;

            if (numeros.length <= 11) {
                if (numeros.length > 9) {
                    valor = numeros.replace(
                        /^(\d{3})(\d{3})(\d{3})(\d{1,2})$/,
                        "$1.$2.$3-$4"
                    );
                } else if (numeros.length > 6) {
                    valor = numeros.replace(
                        /^(\d{3})(\d{3})(\d{1,3})$/,
                        "$1.$2.$3"
                    );
                } else if (numeros.length > 3) {
                    valor = numeros.replace(
                        /^(\d{3})(\d{1,3})$/,
                        "$1.$2"
                    );
                }
            } else {
                if (numeros.length > 12) {
                    valor = numeros.replace(
                        /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{1,2})$/,
                        "$1.$2.$3/$4-$5"
                    );
                } else if (numeros.length > 8) {
                    valor = numeros.replace(
                        /^(\d{2})(\d{3})(\d{3})(\d{1,4})$/,
                        "$1.$2.$3/$4"
                    );
                } else if (numeros.length > 5) {
                    valor = numeros.replace(
                        /^(\d{2})(\d{3})(\d{1,3})$/,
                        "$1.$2.$3"
                    );
                } else if (numeros.length > 2) {
                    valor = numeros.replace(
                        /^(\d{2})(\d{1,3})$/,
                        "$1.$2"
                    );
                }
            }

            cpf.value = valor;
        });
    }


    const cep = document.getElementById("cep");

    if (cep) {
        cep.addEventListener("input", () => {
            let valor = cep.value.replace(/\D/g, "").slice(0, 8);

            if (valor.length > 5) {
                valor = valor.replace(
                    /^(\d{5})(\d{1,3})$/,
                    "$1-$2"
                );
            }

            cep.value = valor;
        });
    }

    const telefone = document.getElementById("telefone");

    if (telefone) {
        telefone.addEventListener("input", () => {
            let valor = telefone.value.replace(/\D/g, "").slice(0, 11);

            if (valor.length > 10) {
                valor = valor.replace(
                    /^(\d{2})(\d{5})(\d{4})$/,
                    "($1) $2-$3"
                );
            } else if (valor.length > 6) {
                valor = valor.replace(
                    /^(\d{2})(\d{4,5})(\d{0,4})$/,
                    "($1) $2-$3"
                );
            } else if (valor.length > 2) {
                valor = valor.replace(
                    /^(\d{2})(\d+)$/,
                    "($1) $2"
                );
            }

            telefone.value = valor;
        });
    }
}



function validarCPF(cpf) {
    const valor = String(cpf || "").replace(/\D/g, "");

    if (valor.length !== 11 || /^(\d)\1{10}$/.test(valor)) {
        return false;
    }

    let soma = 0;

    for (let i = 0; i < 9; i++) {
        soma += Number(valor.charAt(i)) * (10 - i);
    }

    let resto = (soma * 10) % 11;
    if (resto === 10) resto = 0;

    if (resto !== Number(valor.charAt(9))) return false;

    soma = 0;

    for (let i = 0; i < 10; i++) {
        soma += Number(valor.charAt(i)) * (11 - i);
    }

    resto = (soma * 10) % 11;
    if (resto === 10) resto = 0;

    return resto === Number(valor.charAt(10));
}

function validarCEP(cep) {
    return String(cep || "").replace(/\D/g, "").length === 8;
}

function obterInicial(nome) {
    if (!nome) return "?";
    return nome.trim().charAt(0).toUpperCase();
}

function normalizarTexto(texto) {
    return String(texto || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim();
}

function escapeHTML(valor) {
    return String(valor ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function normalizarNomeArquivo(nome) {
    return normalizarTexto(nome)
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "");
}

function mostrarToast(mensagem, tipo = "info") {
    const toast = document.getElementById("toast");
    if (!toast) return;

    toast.textContent = mensagem;
    toast.className = `toast show ${tipo}`;

    setTimeout(() => {
        toast.className = "toast";
    }, 3500);
}
