const API_URL = "http://localhost:5268/api";

let dadosSessao = null;
let colaborador = null;
let equipamentos = [];
let assinaturaDataURL = "";
let termoJaAssinado = false;
let termoAtual = null;

let canvas = null;
let ctx = null;
let desenhando = false;

document.addEventListener("DOMContentLoaded", async () => {
    await carregarDados();
    configurarCanvas();
    configurarBotoes();
    configurarDocumentos();
});

function obterLocalizacao() {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error("Este navegador não suporta localização."));
            return;
        }

        navigator.geolocation.getCurrentPosition(
            posicao => {
                resolve({
                    latitude: posicao.coords.latitude,
                    longitude: posicao.coords.longitude,
                    precisaoLocalizacao: posicao.coords.accuracy
                });
            },
            erro => {
                let mensagem = "Não foi possível obter sua localização.";

                if (erro.code === 1) {
                    mensagem = "A permissão de localização foi negada.";
                }

                if (erro.code === 2) {
                    mensagem = "Não foi possível determinar sua localização.";
                }

                if (erro.code === 3) {
                    mensagem = "A localização demorou muito para responder.";
                }

                reject(new Error(mensagem));
            },
            {
                enableHighAccuracy: false,
                timeout: 10000,
                maximumAge: 60000
            }
        );
    });
}

async function carregarDados() {
    const dados = sessionStorage.getItem("colaboradorTermo");

    if (!dados) {
        mostrarToast(
            "Nenhum colaborador foi selecionado.",
            "erro"
        );

        setTimeout(() => {
            window.location.href = "colaborador.html";
        }, 1200);

        return;
    }

    try {
        dadosSessao = JSON.parse(dados);

        colaborador = dadosSessao.colaborador;

        equipamentos = Array.isArray(dadosSessao.equipamentos)
            ? dadosSessao.equipamentos
            : [];

        preencherDocumento();

        try {
            const resposta = await fetch(
                `${API_URL}/termos/por-colaborador/${colaborador.id}`,
                {
                    method: "GET",
                    credentials: "include"
                }
            );

            if (resposta.status === 404) {
                termoAtual = null;
            } else if (!resposta.ok) {
                throw new Error(
                    "Não foi possível carregar o termo."
                );
            } else {
                termoAtual = await resposta.json();
            }
        } catch (erro) {
            console.error(
                "Erro ao buscar termo do colaborador:",
                erro
            );

            termoAtual = null;
        }

        if (
            termoAtual &&
            String(termoAtual.status || "").toLowerCase() === "assinado"
        ) {
            termoJaAssinado = true;

            if (termoAtual.assinatura) {
                assinaturaDataURL =
                    termoAtual.assinatura.startsWith("data:")
                        ? termoAtual.assinatura
                        : `data:image/png;base64,${termoAtual.assinatura}`;

                aplicarAssinatura(assinaturaDataURL);
            }

            bloquearAssinatura();
            bloquearDocumento();

            const data = termoAtual.dataAssinatura
                ? new Date(termoAtual.dataAssinatura)
                : null;

            if (data && !isNaN(data.getTime())) {
                document.getElementById(
                    "dataHoraAssinatura"
                ).textContent =
                    `Assinado em ${formatarDataHora(data)}`;

                preencherDataAssinatura(data);
            }

            document
                .getElementById("areaTermoAssinado")
                .classList.remove("hidden");

            document.getElementById(
                "statusTermo"
            ).textContent = "TERMO ASSINADO";

            document
                .getElementById("statusTermo")
                .classList.add("assinado");

            preencherDadosDocumentoIdentificacao();
        }
    } catch (erro) {
        console.error(erro);

        mostrarToast(
            "Erro ao carregar os dados do termo.",
            "erro"
        );
    }
}

function preencherDocumento() {
    if (!colaborador) {
        return;
    }

    const nomeTermo =
        colaborador.nomeCompleto ||
        colaborador.nome ||
        "";

    definirTexto("docNome", nomeTermo);
    definirTexto("docCPF", colaborador.cpf);
    definirTexto("docCEP", colaborador.cep);
    definirTexto("docRua", colaborador.rua);
    definirTexto("docNumero", colaborador.numero);
    definirTexto("docBairro", colaborador.bairro);
    definirTexto("docCidade", colaborador.cidade);
    definirTexto("docEstado", colaborador.estado);
    definirTexto("docTelefone", colaborador.telefone);

    definirTexto("guiaNome", nomeTermo);

    definirTexto(
        "assinaturaNomeContrato",
        nomeTermo
    );

    definirTexto(
        "assinaturaCPFContrato",
        colaborador.cpf
    );

    definirTexto(
        "assinaturaNomeGuia",
        nomeTermo
    );

    definirTexto(
        "assinaturaCPFGuia",
        colaborador.cpf
    );

    renderizarEquipamentosDocumento();
}

function definirTexto(id, valor) {
    const elemento = document.getElementById(id);

    if (!elemento) {
        return;
    }

    elemento.textContent = valor || "";
}

function renderizarEquipamentosDocumento() {
    const container =
        document.getElementById(
            "equipamentosDocumento"
        );

    if (!container) {
        return;
    }

    container.innerHTML = "";

    if (!equipamentos.length) {
        container.innerHTML = `
            <div class="equipamento-documento">
                <strong>Equipamentos:</strong>
                Nenhum equipamento encontrado.
            </div>
        `;

        return;
    }

    equipamentos.forEach((equipamento, index) => {
        const bloco =
            document.createElement("div");

        bloco.className =
            "equipamento-documento";

        const numero = index + 1;

        const categoria =
            equipamento.categoria ||
            equipamento.tipo ||
            "Equipamento";

        const marca =
            equipamento.marca || "";

        const modelo =
            equipamento.modelo || "";

        const marcaModelo =
            `${marca} ${modelo}`.trim();

        bloco.innerHTML = `
            <p class="equipamento-titulo">
                Equipamento ${numero}:
            </p>

            <p>
                • ${escapeHTML(categoria)}
            </p>

            ${marcaModelo
                ? `
                        <p>
                            • ${escapeHTML(marcaModelo)}
                        </p>
                    `
                : ""
            }

            ${equipamento.serial
                ? `
                        <p>
                            • Número de série:
                            ${escapeHTML(equipamento.serial)}
                        </p>
                    `
                : ""
            }

            ${equipamento.imei1 ||
                equipamento.imei2
                ? `
                        <p>
                            • ${equipamento.imei1
                    ? "IMEI 1: " +
                    escapeHTML(
                        equipamento.imei1
                    )
                    : ""
                }

                            ${equipamento.imei2
                    ? " / IMEI 2: " +
                    escapeHTML(
                        equipamento.imei2
                    )
                    : ""
                }
                        </p>
                    `
                : ""
            }

            ${equipamento.numero
                ? `
                        <p>
                            • Número:
                            ${escapeHTML(
                    equipamento.numero
                )}
                        </p>
                    `
                : ""
            }

            ${equipamento.capacidade
                ? `
                        <p>
                            • Capacidade:
                            ${escapeHTML(
                    equipamento.capacidade
                )}
                        </p>
                    `
                : ""
            }
        `;

        container.appendChild(bloco);
    });
}

function configurarCanvas() {
    canvas =
        document.getElementById(
            "canvasAssinatura"
        );

    if (!canvas) {
        return;
    }

    ctx = canvas.getContext("2d");

    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    canvas.addEventListener(
        "pointerdown",
        iniciarDesenho
    );

    canvas.addEventListener(
        "pointermove",
        desenhar
    );

    canvas.addEventListener(
        "pointerup",
        finalizarDesenho
    );

    canvas.addEventListener(
        "pointercancel",
        finalizarDesenho
    );

    canvas.addEventListener(
        "pointerleave",
        finalizarDesenho
    );
}

function obterPosicaoCanvas(event) {
    const rect =
        canvas.getBoundingClientRect();

    const escalaX =
        canvas.width / rect.width;

    const escalaY =
        canvas.height / rect.height;

    return {
        x:
            (event.clientX - rect.left) *
            escalaX,

        y:
            (event.clientY - rect.top) *
            escalaY
    };
}

function iniciarDesenho(event) {
    if (termoJaAssinado) {
        return;
    }

    desenhando = true;

    const posicao =
        obterPosicaoCanvas(event);

    ctx.beginPath();

    ctx.moveTo(
        posicao.x,
        posicao.y
    );
}

function desenhar(event) {
    if (
        !desenhando ||
        termoJaAssinado
    ) {
        return;
    }

    const posicao =
        obterPosicaoCanvas(event);

    ctx.lineTo(
        posicao.x,
        posicao.y
    );

    ctx.stroke();
}

function finalizarDesenho() {
    if (!desenhando) {
        return;
    }

    desenhando = false;

    ctx.closePath();

    assinaturaDataURL =
        canvas.toDataURL("image/png");

    aplicarAssinatura(
        assinaturaDataURL
    );
}

function assinaturaExiste() {
    if (!canvas || !ctx) {
        return false;
    }

    const pixels =
        ctx.getImageData(
            0,
            0,
            canvas.width,
            canvas.height
        ).data;

    for (
        let i = 3;
        i < pixels.length;
        i += 4
    ) {
        if (pixels[i] !== 0) {
            return true;
        }
    }

    return false;
}

function limparAssinatura() {
    if (termoJaAssinado) {
        return;
    }

    if (!ctx || !canvas) {
        return;
    }

    ctx.clearRect(
        0,
        0,
        canvas.width,
        canvas.height
    );

    assinaturaDataURL = "";

    limparImagemAssinatura();
}

function limparImagemAssinatura() {
    const imagens = [
        document.getElementById(
            "assinaturaContrato"
        ),
        document.getElementById(
            "assinaturaGuia"
        )
    ];

    imagens.forEach(imagem => {
        if (!imagem) {
            return;
        }

        imagem.removeAttribute("src");

        imagem.classList.remove(
            "visivel"
        );
    });
}

function aplicarAssinatura(dataURL) {
    if (!dataURL) {
        return;
    }

    assinaturaDataURL = dataURL;

    const imagens = [
        document.getElementById(
            "assinaturaContrato"
        ),
        document.getElementById(
            "assinaturaGuia"
        )
    ];

    imagens.forEach(imagem => {
        if (!imagem) {
            return;
        }

        imagem.src = dataURL;

        imagem.classList.add(
            "visivel"
        );
    });
}

function configurarBotoes() {
    const btnLimpar =
        document.getElementById(
            "btnLimparAssinatura"
        );

    if (btnLimpar) {
        btnLimpar.addEventListener(
            "click",
            limparAssinatura
        );
    }

    const btnAssinar =
        document.getElementById(
            "btnAssinar"
        );

    if (btnAssinar) {
        btnAssinar.addEventListener(
            "click",
            assinarTermo
        );
    }

    const btnBaixar =
        document.getElementById(
            "btnBaixarPDF"
        );

    if (btnBaixar) {
        btnBaixar.addEventListener(
            "click",
            baixarPDF
        );
    }

    const btnVoltar =
        document.getElementById(
            "btnVoltar"
        );

    if (btnVoltar) {
        btnVoltar.addEventListener(
            "click",
            () => {
                window.location.href =
                    "colaborador.html";
            }
        );
    }
}

function configurarDocumentos() {
    const inputFrente =
        document.getElementById(
            "fotoDocumentoFrente"
        );

    const inputVerso =
        document.getElementById(
            "fotoDocumentoVerso"
        );

    if (inputFrente) {
        inputFrente.addEventListener(
            "change",
            () => {
                processarPreviewDocumento(
                    inputFrente,
                    "previewDocumentoFrente",
                    "previewDocumentoFrenteContainer"
                );
            }
        );
    }

    if (inputVerso) {
        inputVerso.addEventListener(
            "change",
            () => {
                processarPreviewDocumento(
                    inputVerso,
                    "previewDocumentoVerso",
                    "previewDocumentoVersoContainer"
                );
            }
        );
    }
}

function processarPreviewDocumento(
    input,
    imagemId,
    containerId
) {
    const arquivo =
        input.files?.[0];

    const imagem =
        document.getElementById(
            imagemId
        );

    const container =
        document.getElementById(
            containerId
        );

    if (
        !arquivo ||
        !imagem ||
        !container
    ) {
        return;
    }

    if (!arquivo.type.startsWith("image/")) {
        input.value = "";

        mostrarToast(
            "Selecione uma imagem válida.",
            "erro"
        );

        return;
    }

    const limite =
        5 * 1024 * 1024;

    if (arquivo.size > limite) {
        input.value = "";

        mostrarToast(
            "A imagem não pode ultrapassar 5 MB.",
            "erro"
        );

        return;
    }

    const leitor =
        new FileReader();

    leitor.onload = evento => {
        imagem.src =
            evento.target.result;

        container.classList.remove(
            "hidden"
        );
    };

    leitor.onerror = () => {
        mostrarToast(
            "Não foi possível carregar a imagem.",
            "erro"
        );
    };

    leitor.readAsDataURL(
        arquivo
    );
}

function arquivoParaBase64(arquivo) {
    return new Promise(
        (resolve, reject) => {
            if (!arquivo) {
                resolve(null);
                return;
            }

            const leitor =
                new FileReader();

            leitor.onload = () => {
                resolve(
                    leitor.result
                );
            };

            leitor.onerror = () => {
                reject(
                    new Error(
                        "Não foi possível ler a imagem."
                    )
                );
            };

            leitor.readAsDataURL(
                arquivo
            );
        }
    );
}

async function obterDadosDocumento() {
    const tipoDocumento =
        document.getElementById(
            "tipoDocumento"
        )?.value.trim();

    const nomeDocumento =
        document.getElementById(
            "nomeDocumento"
        )?.value.trim();

    const inputFrente =
        document.getElementById(
            "fotoDocumentoFrente"
        );

    const inputVerso =
        document.getElementById(
            "fotoDocumentoVerso"
        );

    const arquivoFrente =
        inputFrente?.files?.[0];

    const arquivoVerso =
        inputVerso?.files?.[0];

    if (!tipoDocumento) {
        throw new Error(
            "Selecione o tipo do documento."
        );
    }

    if (!nomeDocumento) {
        throw new Error(
            "Informe o número do documento."
        );
    }

    if (!arquivoFrente) {
        throw new Error(
            "A foto da frente do documento é obrigatória."
        );
    }

    const documentoFrente =
        await arquivoParaBase64(
            arquivoFrente
        );

    const documentoVerso =
        arquivoVerso
            ? await arquivoParaBase64(
                arquivoVerso
            )
            : null;

    return {
        tipoDocumento,
        nomeDocumento,
        documentoFrente,
        documentoVerso
    };
}

function preencherDadosDocumentoIdentificacao() {
    if (!termoAtual) {
        return;
    }

    const tipo =
        document.getElementById(
            "tipoDocumento"
        );

    const numero =
        document.getElementById(
            "nomeDocumento"
        );

    if (tipo && termoAtual.tipoDocumento) {
        tipo.value =
            termoAtual.tipoDocumento;
    }

    if (
        numero &&
        termoAtual.nomeDocumento
    ) {
        numero.value =
            termoAtual.nomeDocumento;
    }
}

function bloquearDocumento() {
    const campos = [
        document.getElementById(
            "tipoDocumento"
        ),
        document.getElementById(
            "nomeDocumento"
        ),
        document.getElementById(
            "fotoDocumentoFrente"
        ),
        document.getElementById(
            "fotoDocumentoVerso"
        )
    ];

    campos.forEach(campo => {
        if (campo) {
            campo.disabled = true;
        }
    });
}

async function assinarTermo() {
    if (termoJaAssinado) {
        return;
    }

    if (!assinaturaExiste()) {
        mostrarToast(
            "Faça sua assinatura no campo indicado.",
            "erro"
        );

        return;
    }

    if (!colaborador) {
        mostrarToast(
            "Colaborador não identificado.",
            "erro"
        );

        return;
    }

    let dadosDocumento;
    let localizacao;

    try {
        dadosDocumento =
            await obterDadosDocumento();
    } catch (erro) {
        mostrarToast(
            erro.message ||
            "Verifique os dados do documento.",
            "erro"
        );

        return;
    }

    assinaturaDataURL =
        canvas.toDataURL("image/png");

    aplicarAssinatura(
        assinaturaDataURL
    );

    const agora =
        new Date();

    preencherDataAssinatura(
        agora
    );

    const documento =
        document.getElementById(
            "documento"
        );

    if (!documento) {
        mostrarToast(
            "Documento não encontrado.",
            "erro"
        );

        return;
    }

    const documentoHTML =
        documento.outerHTML;

    let termoId =
        termoAtual?.id;

    try {
        mostrarToast(
            "Obtendo localização...",
            "info"
        );

        localizacao =
            await obterLocalizacao();

        if (!termoId) {
            const respostaCriacao = await fetch(
                `${API_URL}/termos`,
                {
                    method: "POST",
                    credentials: "include",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        colaboradorId: colaborador.id,
                        status: "Pendente",
                        documentoHTML: documentoHTML,
                        equipamentos: equipamentos.map(equipamento => ({
                            equipamentoId: equipamento.id,
                            observacao: null
                        }))
                    })
                }
            );

            if (!respostaCriacao.ok) {
                const erro =
                    await obterMensagemErro(
                        respostaCriacao
                    );

                throw new Error(
                    erro ||
                    "Não foi possível criar o termo."
                );
            }

            termoAtual =
                await respostaCriacao.json();

            termoId =
                termoAtual.id;
        } else {
            const respostaAtualizacao = await fetch(
                `${API_URL}/termos/${termoId}`,
                {
                    method: "PUT",
                    credentials: "include",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        id: termoId,
                        colaboradorId: colaborador.id,
                        status: "Pendente",
                        documentoHTML: documentoHTML
                    })
                }
            );

            if (!respostaAtualizacao.ok) {
                const erro =
                    await obterMensagemErro(
                        respostaAtualizacao
                    );

                throw new Error(
                    erro ||
                    "Não foi possível atualizar o termo."
                );
            }

            if (
                respostaAtualizacao.status !==
                204
            ) {
                termoAtual =
                    await respostaAtualizacao.json();
            }
        }

        mostrarToast(
            "Salvando assinatura...",
            "info"
        );


        const respostaAssinatura =
            await fetch(
                `${API_URL}/termos/${termoId}/assinar`,
                {
                    method: "POST",
                    credentials: "include",

                    headers: {
                        "Content-Type": "application/json"
                    },

                    body: JSON.stringify({
                        assinatura: assinaturaDataURL,

                        latitude: localizacao.latitude,
                        longitude: localizacao.longitude,
                        precisaoLocalizacao: localizacao.precisaoLocalizacao,

                        tipoDocumento: dadosDocumento.tipoDocumento,
                        nomeDocumento: dadosDocumento.nomeDocumento,

                        documentoFrente: dadosDocumento.documentoFrente,
                        documentoVerso: dadosDocumento.documentoVerso
                    })
                }
            );


        if (!respostaAssinatura.ok) {
            const erro = await obterMensagemErro(respostaAssinatura);

            console.error("Erro ao salvar assinatura:", {
                status: respostaAssinatura.status,
                mensagem: erro
            });

            throw new Error(
                `Erro HTTP ${respostaAssinatura.status}: ${erro || "Não foi possível salvar a assinatura."
                }`
            );
        }


        const resultadoAssinatura =
            await respostaAssinatura.json();

        termoAtual = {
            ...(termoAtual || {}),
            ...resultadoAssinatura,
            id: termoId,
            colaboradorId:
                colaborador.id,
            status: "Assinado",
            dataAssinatura:
                resultadoAssinatura.dataAssinatura ||
                agora.toISOString(),
            assinatura:
                assinaturaDataURL,
            tipoDocumento:
                dadosDocumento.tipoDocumento,
            nomeDocumento:
                dadosDocumento.nomeDocumento
        };

        termoJaAssinado = true;

        colaborador.temTermoAssinado =
            true;

        sessionStorage.setItem(
            "colaboradorTermo",
            JSON.stringify({
                colaborador:
                    colaborador,

                equipamentos:
                    equipamentos
            })
        );

        bloquearAssinatura();
        bloquearDocumento();

        document.getElementById(
            "statusTermo"
        ).textContent =
            "TERMO ASSINADO";

        document
            .getElementById("statusTermo")
            .classList.add("assinado");

        document.getElementById(
            "dataHoraAssinatura"
        ).textContent =
            `Assinado em ${formatarDataHora(
                agora
            )}`;

        document
            .getElementById(
                "areaTermoAssinado"
            )
            .classList.remove(
                "hidden"
            );

        mostrarToast(
            "Termo assinado e salvo com sucesso.",
            "sucesso"
        );
    } catch (erro) {
        console.error(
            "Erro ao assinar termo:",
            erro
        );

        mostrarToast(
            erro.message ||
            "Não foi possível salvar o termo.",
            "erro"
        );
    }
}

async function obterMensagemErro(resposta) {
    try {
        const texto =
            await resposta.text();

        if (!texto) {
            return "";
        }

        try {
            const dados =
                JSON.parse(texto);

            return (
                dados.mensagem ||
                dados.message ||
                dados.title ||
                texto
            );
        } catch {
            return texto;
        }
    } catch {
        return "";
    }
}

function preencherDataAssinatura(data) {
    const dia =
        String(
            data.getDate()
        ).padStart(2, "0");

    const mes =
        obterNomeMes(
            data.getMonth()
        );

    const ano =
        data.getFullYear();

    const dataContrato =
        document.getElementById(
            "dataContrato"
        );

    const mesContrato =
        document.getElementById(
            "mesContrato"
        );

    const anoContrato =
        document.getElementById(
            "anoContrato"
        );

    const dataContratoGuia =
        document.getElementById(
            "dataContratoGuia"
        );

    const mesContratoGuia =
        document.getElementById(
            "mesContratoGuia"
        );

    const anoContratoGuia =
        document.getElementById(
            "anoContratoGuia"
        );

    if (dataContrato) {
        dataContrato.textContent =
            dia;
    }

    if (mesContrato) {
        mesContrato.textContent =
            mes;
    }

    if (anoContrato) {
        anoContrato.textContent =
            ano;
    }

    if (dataContratoGuia) {
        dataContratoGuia.textContent =
            dia;
    }

    if (mesContratoGuia) {
        mesContratoGuia.textContent =
            mes;
    }

    if (anoContratoGuia) {
        anoContratoGuia.textContent =
            ano;
    }
}

function formatarDataHora(data) {
    return data.toLocaleString(
        "pt-BR",
        {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        }
    );
}

function obterNomeMes(numero) {
    const meses = [
        "janeiro",
        "fevereiro",
        "março",
        "abril",
        "maio",
        "junho",
        "julho",
        "agosto",
        "setembro",
        "outubro",
        "novembro",
        "dezembro"
    ];

    return meses[numero];
}

function bloquearAssinatura() {
    const botoes = [
        document.getElementById(
            "btnLimparAssinatura"
        ),

        document.getElementById(
            "btnAssinar"
        )
    ];

    botoes.forEach(botao => {
        if (botao) {
            botao.disabled = true;
        }
    });

    if (canvas) {
        canvas.classList.add(
            "assinatura-bloqueada"
        );
    }
}

async function baixarPDF() {
    const documento =
        document.getElementById(
            "documento"
        );

    if (!documento) {
        mostrarToast(
            "Documento não encontrado.",
            "erro"
        );

        return;
    }

    let iframe = null;

    try {
        if (
            typeof html2canvas ===
            "undefined" ||
            typeof window.jspdf ===
            "undefined"
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

        const colaboradorSessao =
            JSON.parse(
                sessionStorage.getItem(
                    "colaboradorTermo"
                )
            )?.colaborador;

        const nome =
            normalizarNomeArquivo(
                colaboradorSessao?.nomeCompleto ||
                colaboradorSessao?.nome ||
                "colaborador"
            );

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

        const iframeDocument =
            iframe.contentDocument ||
            iframe.contentWindow.document;

        const caminhoCSS =
            new URL(
                "css/style.css",
                window.location.href
            ).href;

        iframeDocument.open();

        iframeDocument.write(`
            <!DOCTYPE html>
            <html lang="pt-BR">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <link rel="stylesheet" href="${caminhoCSS}">
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

                        ${documento.outerHTML}

                    </section>

                </main>

            </body>

            </html>
        `);

        iframeDocument.close();

        await new Promise(
            resolve => {
                const verificar =
                    () => {
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
            }
        );

        const imagens =
            Array.from(
                iframeDocument.images
            );

        await Promise.all(
            imagens.map(img => {
                if (img.complete) {
                    return Promise.resolve();
                }

                return new Promise(
                    resolve => {
                        img.onload =
                            resolve;

                        img.onerror =
                            resolve;
                    }
                );
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

        const { jsPDF } =
            window.jspdf;

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
            const pagina =
                paginas[i];

            const rect =
                pagina.getBoundingClientRect();

            const canvasPDF =
                await html2canvas(
                    pagina,
                    {
                        scale: 2,

                        useCORS: true,

                        allowTaint: true,

                        backgroundColor:
                            "#ffffff",

                        logging: false,

                        width:
                            Math.round(
                                rect.width
                            ),

                        height:
                            Math.round(
                                rect.height
                            ),

                        scrollX: 0,

                        scrollY: 0,

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
                    "image/jpeg",
                    0.98
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

        pdf.save(
            `Termo_Comodato_${nome}.pdf`
        );

        mostrarToast(
            "PDF baixado com sucesso.",
            "sucesso"
        );
    } catch (erro) {
        console.error(
            "Erro ao baixar PDF:",
            erro
        );

        mostrarToast(
            "Não foi possível gerar o PDF.",
            "erro"
        );
    } finally {
        if (
            iframe &&
            iframe.parentNode
        ) {
            iframe.remove();
        }
    }
}

function normalizarNomeArquivo(nome) {
    return String(
        nome || "colaborador"
    )
        .normalize("NFD")
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
            "");
}

function escapeHTML(valor) {
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

    setTimeout(() => {
        toast.className =
            "toast";
    }, 3500);
}