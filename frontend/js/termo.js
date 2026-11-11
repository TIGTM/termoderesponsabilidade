const API_URL = "/api";

let dadosSessao = null;
let colaborador = null;
let equipamentos = [];
let assinaturaDataURL = "";
let termoJaAssinado = false;
let termoAtual = null;
let tipoTermoAtual = "CPF";
let documentoInformado = "";
let autorizacaoPendente = null;

let razaoSocialCNPJ = "";
let consultaCNPJConcluida = false;

async function consultarRazaoSocialCNPJ(cnpj) {
    const numero = String(cnpj || "").replace(/\D/g, "");

    if (numero.length !== 14) {
        throw new Error("CNPJ inválido.");
    }

    const resposta = await fetch(
        `${API_URL}/cnpj/${numero}`
    );

    if (!resposta.ok) {
        throw new Error("Não foi possível consultar o CNPJ.");
    }

    const dados = await resposta.json();
    const razaoSocial = dados.razao_social?.trim();

    if (!razaoSocial) {
        throw new Error("Razão social não encontrada.");
    }

    return razaoSocial;
}

let canvas = null;
let ctx = null;
let desenhando = false;

document.addEventListener("DOMContentLoaded", async () => {
    await carregarDados();
    configurarCanvas();
    configurarBotoes();
    configurarDocumentos();
    configurarEmailAutorizacao();
    await carregarEmailAutorizacao();
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
                timeout: 15000,
                maximumAge: 300000
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

        tipoTermoAtual =
            dadosSessao.tipoTermo === "CNPJ" ? "CNPJ" : "CPF";

        documentoInformado =
            dadosSessao.documentoInformado ||
            colaborador.cpf ||
            "";

        preencherDocumento();

        if (tipoTermoAtual === "CNPJ") {
            const numeroCNPJ = String(documentoInformado || "")
                .replace(/\D/g, "");

            if (numeroCNPJ.length === 14) {
                try {
                    mostrarToast("Consultando razão social...", "info");

                    razaoSocialCNPJ = await consultarRazaoSocialCNPJ(numeroCNPJ);

                    consultaCNPJConcluida = true;

                    definirTexto("docRazaoSocial", razaoSocialCNPJ);

                    mostrarToast(
                        "Razão social encontrada com sucesso.",
                        "sucesso"
                    );
                } catch (erro) {
                    console.error("Erro ao consultar CNPJ:", erro);

                    consultaCNPJConcluida = false;

                    mostrarToast(erro.message, "erro");
                }
            } else {
                consultaCNPJConcluida = false;
                mostrarToast("CNPJ inválido.", "erro");
            }
        }

        try {
            const resposta = await fetch(
                `${API_URL}/termos/por-colaborador/${colaborador.id}?tipoTermo=${encodeURIComponent(tipoTermoAtual)}`,
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

    const documento =
        tipoTermoAtual === "CNPJ"
            ? documentoInformado
            : colaborador.cpf;

    definirTexto("docNome", nomeTermo);
    definirTexto("docCPF", documento);

    definirTexto("docCEP", colaborador.cep);
    definirTexto("docRua", colaborador.rua);
    definirTexto("docNumero", colaborador.numero);
    definirTexto("docBairro", colaborador.bairro);
    definirTexto("docCidade", colaborador.cidade);
    definirTexto("docEstado", colaborador.estado);
    definirTexto("docTelefone", colaborador.telefone);

    definirTexto("guiaNome", nomeTermo);

    definirTexto("assinaturaNomeContrato", nomeTermo);
    definirTexto("assinaturaNomeGuia", nomeTermo);
    definirTexto("assinaturaNomeDeclaracao", nomeTermo);
    definirTexto("assinaturaNomeFisica", nomeTermo);


    const agora = new Date();

    const meses = [
        "janeiro", "fevereiro", "março", "abril",
        "maio", "junho", "julho", "agosto",
        "setembro", "outubro", "novembro", "dezembro"
    ];

    definirTexto("dataDeclaracao", String(agora.getDate()).padStart(2, "0"));
    definirTexto("mesDeclaracao", meses[agora.getMonth()]);
    definirTexto("anoDeclaracao", agora.getFullYear());


    definirTexto("assinaturaCPFContrato", documento);
    definirTexto("assinaturaCPFGuia", documento);
    definirTexto("assinaturaCPFDeclaracao", documento);
    definirTexto("assinaturaCPFFisica", documento);

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
        ),
        document.getElementById(
            "assinaturaDeclaracao"
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
        document.getElementById("assinaturaContrato"),
        document.getElementById("assinaturaGuia"),
        document.getElementById("assinaturaDeclaracao")
    ];

    imagens.forEach(imagem => {
        if (!imagem) {
            return;
        }

        imagem.src = dataURL;

        imagem.classList.add("visivel");
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

    document.getElementById("btnConfirmarAssinatura")?.addEventListener(
        "click",
        confirmarAssinatura
    );

    document.getElementById("btnFinalizarAssinatura")?.addEventListener(
        "click",
        finalizarAssinatura
    );

    document.getElementById("btnReenviarCodigo")?.addEventListener(
        "click",
        reenviarCodigoAssinatura
    );

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

function configurarEmailAutorizacao() {
    document.getElementById("formEmailAutorizacao")?.addEventListener("submit", assinarTermo);
}

async function carregarEmailAutorizacao() {
    try {
        const resposta = await fetch(`${API_URL}/colaborador-email`, { credentials: "include", cache: "no-store" });
        if (!resposta.ok) throw new Error("Não foi possível consultar o e-mail de confirmação.");
        const dados = await resposta.json();
        const campoEmail = document.getElementById("emailAutorizacao");
        if (campoEmail && dados.email) campoEmail.value = dados.email;
    } catch (erro) {
        console.error("Erro ao carregar e-mail de confirmação:", erro);
        definirMensagemEmail(erro.message || "Não foi possível consultar o e-mail de confirmação.");
    }
}

function definirMensagemEmail(mensagem) {
    const campo = document.getElementById("mensagemEmailAutorizacao");
    if (campo) campo.textContent = mensagem;
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

async function assinarTermo(evento) {
    evento?.preventDefault();

    if (termoJaAssinado) {
        return;
    }

    const email = document.getElementById("emailAutorizacao")?.value.trim() || "";
    if (!/^\S+@\S+\.\S+$/.test(email)) {
        definirMensagemEmail("Informe um e-mail válido para receber o código.");
        document.getElementById("emailAutorizacao")?.focus();
        return;
    }

    if (tipoTermoAtual === "CNPJ" && !consultaCNPJConcluida) {
        mostrarToast(
            "Não foi possível confirmar a razão social. Verifique o CNPJ antes de assinar.",
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

    const botao = document.getElementById("btnAssinar");
    if (botao?.disabled) return;
    if (botao) {
        botao.disabled = true;
        botao.setAttribute("aria-busy", "true");
        botao.textContent = "Enviando código...";
    }
    definirMensagemEmail("Preparando o termo e enviando o código...");

    try {
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
                        tipoTermo: tipoTermoAtual,
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

        const respostaCodigo = await fetch(
            `${API_URL}/termos/${termoId}/solicitar-codigo-assinatura`,
            {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email })
            }
        );
        if (!respostaCodigo.ok) {
            throw new Error(await obterMensagemErro(respostaCodigo));
        }

        const dadosCodigo = await respostaCodigo.json();
        autorizacaoPendente = {
            termoId,
            dadosDocumento,
            email,
            codigoAutorizacaoId: dadosCodigo.codigoAutorizacaoId
        };
        document.getElementById("formEmailAutorizacao")?.classList.add("hidden");
        definirMensagemEmail(`Código enviado para ${dadosCodigo.emailMascarado}.`);
        document.getElementById("areaConfirmacaoAssinatura")?.classList.remove("hidden");
        document.getElementById("orientacaoCodigoAssinatura").textContent =
            `Enviamos um código de 6 dígitos para ${dadosCodigo.emailMascarado}. Ele expira em 15 minutos.`;
        document.getElementById("codigoAssinatura")?.focus();
        mostrarToast("Código enviado. Confira seu e-mail para concluir a assinatura.", "info");
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
    } finally {
        if (botao) {
            botao.disabled = false;
            botao.removeAttribute("aria-busy");
            botao.textContent = "Enviar código para assinar";
        }
    }
}

async function reenviarCodigoAssinatura() {
    if (!autorizacaoPendente) return;

    const resposta = await fetch(
        `${API_URL}/termos/${autorizacaoPendente.termoId}/solicitar-codigo-assinatura`,
        {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: autorizacaoPendente.email })
        }
    );

    if (!resposta.ok) {
        document.getElementById("mensagemCodigoAssinatura").textContent = await obterMensagemErro(resposta);
        return;
    }

    const dados = await resposta.json();
    autorizacaoPendente.codigoAutorizacaoId = dados.codigoAutorizacaoId;
    document.getElementById("codigoAssinatura").value = "";
    document.getElementById("orientacaoCodigoAssinatura").textContent =
        `Enviamos outro código para ${dados.emailMascarado}. Ele expira em 15 minutos.`;
}

async function confirmarAssinatura() {
    if (!autorizacaoPendente) return;

    const codigo = document.getElementById("codigoAssinatura")?.value.trim() || "";
    const mensagem = document.getElementById("mensagemCodigoAssinatura");
    const botao = document.getElementById("btnConfirmarAssinatura");
    if (!/^\d{6}$/.test(codigo)) {
        mensagem.textContent = "Informe o código de 6 dígitos enviado para seu e-mail.";
        document.getElementById("codigoAssinatura")?.focus();
        return;
    }

    botao.disabled = true;
    mensagem.textContent = "Confirmando assinatura...";

    try {
        const resposta = await fetch(`${API_URL}/termos/${autorizacaoPendente.termoId}/confirmar-codigo-assinatura`, {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                codigoAutorizacaoId: autorizacaoPendente.codigoAutorizacaoId,
                codigo
            })
        });

        if (!resposta.ok) throw new Error(await obterMensagemErro(resposta));
        if (colaborador) colaborador.email = autorizacaoPendente.email;
        document.getElementById("areaConfirmacaoAssinatura").classList.add("hidden");
        document.getElementById("areaDesenhoAssinatura").classList.remove("hidden");
        document.getElementById("canvasAssinatura")?.focus();
        mostrarToast("Código confirmado. Desenhe sua assinatura para concluir.", "sucesso");
    } catch (erro) {
        mensagem.textContent = erro.message || "Não foi possível confirmar o código.";
    } finally {
        botao.disabled = false;
    }
}

async function finalizarAssinatura() {
    if (!autorizacaoPendente || termoJaAssinado) return;
    if (!assinaturaExiste()) {
        mostrarToast("Faça sua assinatura no campo indicado.", "erro");
        return;
    }

    const botao = document.getElementById("btnFinalizarAssinatura");
    const dados = autorizacaoPendente.dadosDocumento;
    let localizacao = null;
    let localizacaoIndisponivel = false;
    assinaturaDataURL = canvas.toDataURL("image/png");
    aplicarAssinatura(assinaturaDataURL);
    const agora = new Date();
    preencherDataAssinatura(agora);
    botao.disabled = true;
    botao.setAttribute("aria-busy", "true");
    botao.textContent = "Aguardando localização...";

    try {
        try {
            localizacao = await obterLocalizacao();
        } catch (erroLocalizacao) {
            localizacaoIndisponivel = true;
            console.warn("Localização indisponível; a assinatura será salva sem coordenadas:", erroLocalizacao);
        }

        botao.textContent = "Salvando assinatura...";
        const resposta = await fetch(`${API_URL}/termos/${autorizacaoPendente.termoId}/assinar`, {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                codigoAutorizacaoId: autorizacaoPendente.codigoAutorizacaoId,
                assinatura: assinaturaDataURL,
                latitude: localizacao?.latitude ?? null,
                longitude: localizacao?.longitude ?? null,
                precisaoLocalizacao: localizacao?.precisaoLocalizacao ?? null,
                tipoDocumento: dados.tipoDocumento,
                nomeDocumento: dados.nomeDocumento,
                documentoFrente: dados.documentoFrente,
                documentoVerso: dados.documentoVerso
            })
        });
        if (!resposta.ok) throw new Error(await obterMensagemErro(resposta));

        const resultado = await resposta.json();
        termoAtual = { ...(termoAtual || {}), ...resultado, id: autorizacaoPendente.termoId, colaboradorId: colaborador.id, status: "Assinado", dataAssinatura: resultado.dataAssinatura || agora.toISOString() };
        termoJaAssinado = true;
        colaborador.temTermoAssinado = true;
        sessionStorage.setItem("colaboradorTermo", JSON.stringify({ ...dadosSessao, colaborador, equipamentos, tipoTermo: tipoTermoAtual, documentoInformado }));
        bloquearAssinatura();
        bloquearDocumento();
        document.getElementById("statusTermo").textContent = "TERMO ASSINADO";
        document.getElementById("statusTermo").classList.add("assinado");
        document.getElementById("dataHoraAssinatura").textContent = `Assinado em ${formatarDataHora(agora)}`;
        document.getElementById("areaTermoAssinado").classList.remove("hidden");
        document.getElementById("areaDesenhoAssinatura").classList.add("hidden");
        autorizacaoPendente = null;
        mostrarToast(
            localizacaoIndisponivel
                ? "Termo assinado. A localização não foi registrada, mas o IP foi salvo."
                : "Termo assinado e salvo com sucesso.",
            localizacaoIndisponivel ? "info" : "sucesso"
        );
    } catch (erro) {
        mostrarToast(erro.message || "Não foi possível concluir a assinatura.", "erro");
    } finally {
        botao.disabled = false;
        botao.removeAttribute("aria-busy");
        botao.textContent = "Assinar termo";
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
        ),

        document.getElementById(
            "btnFinalizarAssinatura"
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
                        min-height: 297mm !important;
                        height: 297mm !important;
                        max-height: 297mm !important;
                        margin: 0 !important;
                        padding: 22mm 20mm 20mm !important;
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

        paginarDocumentoParaPDF(iframeDocument);

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

        const larguraPagina = 210;
        const alturaPagina = 297;

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
                0,
                0,
                larguraPagina,
                alturaPagina,
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

function paginarDocumentoParaPDF(documento) {
    const paginasOriginais = Array.from(documento.querySelectorAll(".document-page"));

    paginasOriginais.forEach(paginaOriginal => {
        const conteudoOriginal = paginaOriginal.querySelector(":scope > .document-content");
        if (!conteudoOriginal) return;

        const equipamentos = conteudoOriginal.querySelector(":scope > #equipamentosDocumento");
        if (equipamentos) {
            Array.from(equipamentos.children).forEach(bloco => {
                conteudoOriginal.insertBefore(bloco, equipamentos);
            });
            equipamentos.remove();
        }

        const itens = Array.from(conteudoOriginal.children);
        if (!itens.length) return;

        conteudoOriginal.replaceChildren();
        let paginaAtual = paginaOriginal;
        let conteudoAtual = conteudoOriginal;

        itens.forEach(item => {
            conteudoAtual.appendChild(item);
            const ultrapassouLimite = paginaAtual.scrollHeight > paginaAtual.clientHeight + 1;

            if (!ultrapassouLimite || conteudoAtual.children.length === 1) return;

            conteudoAtual.removeChild(item);
            const proximaPagina = paginaOriginal.cloneNode(false);
            const proximoConteudo = documento.createElement("div");
            proximoConteudo.className = "document-content";
            proximaPagina.appendChild(proximoConteudo);
            paginaAtual.parentNode.insertBefore(proximaPagina, paginaAtual.nextSibling);
            paginaAtual = proximaPagina;
            conteudoAtual = proximoConteudo;
            conteudoAtual.appendChild(item);
        });
    });
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
