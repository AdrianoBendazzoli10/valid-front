import Header from "./components/Header";
import Footer from "./components/Footer";
import BackToTop from "./components/BackToTop";
import "./Analise.css";
import { useState, useEffect } from "react";
import { LuDownload } from "react-icons/lu";
import { FaFilePdf } from "react-icons/fa";
import { GoShieldCheck, GoShield, GoAlert } from "react-icons/go";
import { FaCheck } from "react-icons/fa6";


// =========================================================
// CONFIGURAÇÃO DAS APIs
// IA: análise de documentos, comparação, imagens e PDF.
// Backend: autenticação, usuários e histórico de análises.
// =========================================================
const API_URL = (
    import.meta.env.VITE_API_URL ||
    "https://eocr-pixel-mescla-production.up.railway.app"
).replace(/\/+$/, "");

const BACKEND_API_URL = (
    import.meta.env.VITE_BACKEND_API_URL ||
    "https://valid-back.onrender.com"
).replace(/\/+$/, "");

const TEMPO_LIMITE_MS = 120000; // 2 minutos
const TEMPO_LIMITE_HISTORICO_MS = 30000;
const MAX_TRECHOS_VISIVEIS = 5;

// Faixas do índice de suspeita (0 a 100) usadas para colorir o medidor e as
// verificações. AJUSTE para os mesmos cortes que o backend usa para
// classificar em Baixa / Média / Alta.
const LIMITES = { medio: 30, alto: 60 };


// =========================================================
// TEXTOS E CONFIGURAÇÕES DO RESULTADO
// =========================================================

// Resultado da análise individual (chave = status calculado a partir da classificação)
const VEREDITOS = {
    autentico: {
        nivel: "baixo",
        Icone: GoShieldCheck,
        titulo: "Nenhum sinal relevante de alteração",
        resumo:
            "O VALID não encontrou indícios importantes de que este documento foi editado.",
        passos: [
            "Você pode seguir com a conferência normal do documento.",
            "Lembre-se: a ausência de sinais não garante que o documento seja verdadeiro."
        ]
    },
    atencao: {
        nivel: "medio",
        Icone: GoShield,
        titulo: "Vale conferir com mais atenção",
        resumo:
            "Foram encontrados alguns sinais que merecem uma segunda olhada, ou não foi possível chegar a uma conclusão segura.",
        passos: [
            "Veja abaixo quais pontos do documento chamaram atenção.",
            "Confira o documento original ou peça uma nova via a quem o emitiu."
        ]
    },
    suspeito: {
        nivel: "alto",
        Icone: GoAlert,
        titulo: "Foram encontrados sinais de possível alteração",
        resumo:
            "O documento tem características comuns em arquivos editados. Isso não prova fraude, mas exige conferência.",
        passos: [
            "Não aceite o documento apenas com base nesta análise.",
            "Peça o original ou confirme os dados diretamente com quem o emitiu.",
            "Se necessário, encaminhe para uma perícia documentoscópica."
        ]
    }
};

const ROTULO_SUSPEITA = { baixo: "Baixa", medio: "Média", alto: "Alta" };

const ROTULO_VERIFICACAO = {
    baixo: "Nada fora do comum",
    medio: "Algumas irregularidades",
    alto: "Muitas irregularidades"
};

// O que o VALID verifica (chave = campo de analise_global)
const VERIFICACOES = [
    {
        chave: "pixel_score",
        titulo: "Aparência da imagem",
        descricao:
            "Procura trechos que parecem ter sido editados, colados ou apagados."
    },
    {
        chave: "geometry_score",
        titulo: "Texto do documento",
        descricao:
            "Verifica se letras e linhas estão alinhadas e espaçadas de forma natural."
    }
];

const IMAGENS = [
    {
        arquivo: "block_heatmap.png",
        titulo: "Mapa de áreas suspeitas",
        legenda:
            "Áreas destacadas indicam onde o VALID encontrou diferenças em relação ao restante do documento.",
        alt: "Mapa de calor da análise de pixels"
    },
    {
        arquivo: "hybrid_analysis.png",
        titulo: "Trechos de texto analisados",
        legenda: "Mostra os trechos de texto que o VALID encontrou e analisou.",
        alt: "Resultado visual da análise do texto (EOCR)"
    },
    {
        arquivo: "continuity_heatmap.png",
        titulo: "Mapa de continuidade",
        legenda:
            "Mostra onde a textura da imagem muda de forma brusca, o que pode indicar emendas ou colagens.",
        alt: "Mapa de calor da continuidade dos pixels"
    }
];

// Resultado da comparação (chave = status devolvido pela API)
const STATUS_COMPARACAO = {
    COMPATIVEL: {
        nivel: "baixo",
        Icone: GoShieldCheck,
        titulo: "Documentos compatíveis",
        rotulo: "Compatível",
        resumo:
            "Os campos comparáveis encontrados nos dois documentos apresentam correspondência."
    },
    REQUER_REVISAO: {
        nivel: "medio",
        Icone: GoShield,
        titulo: "Compatibilidade com ressalvas",
        rotulo: "Requer revisão",
        resumo:
            "Os valores podem coincidir, mas há dados que exigem revisão de validade antes da conclusão."
    },
    "SEM DADOS SUFICIENTES": {
        nivel: "neutro",
        Icone: GoShield,
        titulo: "Dados insuficientes",
        rotulo: "Dados insuficientes",
        resumo:
            "Não foram encontrados campos suficientes para concluir a comparação com segurança."
    }
};

const STATUS_COMPARACAO_PADRAO = {
    nivel: "alto",
    Icone: GoAlert,
    titulo: "Documentos divergentes",
    rotulo: "Divergente",
    resumo: "Foram identificadas divergências entre os campos extraídos dos documentos."
};

const CAMPOS_COMPARACAO = [
    { chave: "nome", titulo: "Nome" },
    { chave: "cpf", titulo: "CPF" },
    { chave: "data", titulo: "Data" }
];

const STATUS_CAMPO = {
    COMPATIVEL: { rotulo: "Compatível", nivel: "baixo" },
    PARCIALMENTE_COMPATIVEL: { rotulo: "Parcialmente compatível", nivel: "medio" },
    AMBIGUO: { rotulo: "Ambíguo", nivel: "medio" },
    INVALIDO: { rotulo: "Inválido", nivel: "alto" },
    NAO_IDENTIFICADO: { rotulo: "Não identificado", nivel: "neutro" },
    NAO_COMPARAVEL: { rotulo: "Não identificado", nivel: "neutro" }
};

const STATUS_CAMPO_PADRAO = { rotulo: "Divergente", nivel: "alto" };

const VALIDACAO_CPF = {
    valid: "Válido",
    corrected: "Corrigido pelo OCR",
    invalid: "Inválido",
    ambiguous: "Ambíguo",
    not_found: "Não identificado"
};


// =========================================================
// FUNÇÕES AUXILIARES
// =========================================================

// fetch com tempo limite, para o usuário não ficar preso no loading
async function fetchComTimeout(url, options = {}, ms = TEMPO_LIMITE_MS) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), ms);

    try {
        return await fetch(url, { ...options, signal: controller.signal });
    } finally {
        clearTimeout(timer);
    }
}


// Converte erros técnicos em mensagens amigáveis
function mensagemDeErro(err, padrao) {
    if (err?.name === "AbortError") {
        return "O servidor demorou demais para responder. Tente novamente.";
    }
    if (err instanceof TypeError) {
        return "Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.";
    }
    if (err instanceof SyntaxError) {
        return "O servidor retornou uma resposta inválida.";
    }
    return err?.message || padrao;
}


// Salva a análise no histórico do usuário logado (falhas não bloqueiam o resultado)
async function salvarNoHistorico(arquivo, resultado) {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
        const resposta = await fetchComTimeout(
            `${BACKEND_API_URL}/analises/`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    nome_arquivo: arquivo.name,
                    tamanho_bytes: arquivo.size,
                    resultado
                })
            },
            TEMPO_LIMITE_HISTORICO_MS
        );

        if (!resposta.ok) {
            console.warn("Histórico não salvo:", await resposta.text());
        }
    } catch (falha) {
        console.warn("API de histórico indisponível:", falha);
    }
}


// Número formatado ou "—" quando o valor não existe
function formatar(valor, casas = 1) {
    const n = Number(valor);
    return valor == null || valor === "" || !Number.isFinite(n)
        ? "—"
        : n.toFixed(casas);
}


function nivelDoScore(score) {
    if (score >= LIMITES.alto) return "alto";
    if (score >= LIMITES.medio) return "medio";
    return "baixo";
}


function nivelDoTexto(texto = "") {
    const t = String(texto).toLowerCase();
    if (t.includes("alt")) return "alto";
    if (t.includes("baix")) return "baixo";
    return "medio";
}


// "autentico" só quando a classificação é explicitamente baixa.
// Média ou não identificada => "atencao" (revisão manual).
function obterStatus(classificacao = "") {
    const c = classificacao.toLowerCase();
    if (c.includes("alta")) return "suspeito";
    if (c.includes("baixa")) return "autentico";
    return "atencao";
}


function formatarValor(valor) {
    if (Array.isArray(valor)) {
        return valor.length ? valor.join(", ") : "Não identificado";
    }
    if (valor === null || valor === undefined || valor === "") {
        return "Não identificado";
    }
    return String(valor);
}


// =========================================================
// COMPONENTES PEQUENOS
// =========================================================

function ScannerLoading({ eyebrow, titulo, texto, status }) {
    return (
        <div className="scanner-loading">
            <div className="scanner-particles">
                {Array.from({ length: 8 }, (_, i) => (
                    <span key={i}></span>
                ))}
            </div>

            <div className="document-scanner">
                <div className="fake-document">
                    <div className="doc-top">
                        <div className="doc-symbol"></div>
                        <div className="doc-title-lines">
                            <span></span>
                            <span></span>
                        </div>
                    </div>

                    <div className="doc-line long"></div>
                    <div className="doc-line medium"></div>
                    <div className="doc-line short"></div>

                    <div className="doc-block">
                        <span></span>
                        <span></span>
                        <span></span>
                    </div>

                    <div className="doc-line long"></div>
                    <div className="doc-line medium"></div>

                    <div className="scanner-line">
                        <div className="scanner-line-glow"></div>
                    </div>
                </div>
            </div>

            <div className="loading-text">
                <div className="loading-eyebrow">
                    <span className="pulse-dot"></span>
                    {eyebrow}
                </div>
                <h2>{titulo}</h2>
                <p>{texto}</p>
                <div className="loading-status">
                    <span className="status-loader"></span>
                    {status}
                </div>
            </div>
        </div>
    );
}


// Faixa de resultado: ícone + título + explicação em uma frase
function Veredito({ nivel, Icone, rotulo, titulo, resumo }) {
    return (
        <div className="veredito" data-nivel={nivel}>
            <div className="veredito-icone">
                <Icone />
            </div>
            <div className="veredito-texto">
                <span className="mini-label">{rotulo}</span>
                <h2>{titulo}</h2>
                <p>{resumo}</p>
            </div>
        </div>
    );
}


// Régua Baixo / Médio / Alto com um marcador na posição do índice
function MedidorSuspeita({ score, nivel }) {
    const valor = Math.min(Math.max(Number(score) || 0, 0), 100);

    return (
        <div
            className="medidor"
            data-nivel={nivel}
            role="img"
            aria-label={`Índice de suspeita: ${valor.toFixed(0)} de 100`}
        >
            <div
                className="medidor-faixa"
                style={{
                    "--medio": `${LIMITES.medio}%`,
                    "--alto": `${LIMITES.alto}%`
                }}
            >
                <span
                    className="medidor-marcador"
                    style={{ left: `${valor}%` }}
                ></span>
            </div>

            <div className="medidor-legenda">
                <span style={{ flex: LIMITES.medio }}>Baixo</span>
                <span style={{ flex: LIMITES.alto - LIMITES.medio }}>Médio</span>
                <span style={{ flex: 100 - LIMITES.alto }}>Alto</span>
            </div>
        </div>
    );
}


function Verificacao({ titulo, descricao, score }) {
    const valor = Number(score) || 0;
    const nivel = nivelDoScore(valor);

    return (
        <div className="verificacao" data-nivel={nivel}>
            <div className="verificacao-topo">
                <h4>{titulo}</h4>
                <span className="chip">{ROTULO_VERIFICACAO[nivel]}</span>
            </div>
            <p>{descricao}</p>
            <div className="barra">
                <div style={{ width: `${Math.min(valor, 100)}%` }}></div>
            </div>
        </div>
    );
}


function AvisoFerramenta() {
    return (
        <p className="aviso">
            O VALID é uma ferramenta de apoio. Este resultado indica possíveis sinais de
            alteração: não prova que o documento é falso, nem garante que seja verdadeiro.
            Ele não substitui a perícia documentoscópica nem a conferência feita por
            profissionais responsáveis.
        </p>
    );
}


function CartaoDocumento({ rotulo, arquivo, vazio, descricao, aoSelecionar }) {
    return (
        <div className={`comparacao-arquivo-card ${arquivo ? "selecionado" : ""}`}>
            <div className="comparacao-arquivo-icone">
                <FaFilePdf />
            </div>

            <span className="mini-label">{rotulo}</span>
            <h3 title={arquivo?.name}>{arquivo ? arquivo.name : vazio}</h3>
            <p>{descricao}</p>

            <div className="btn-upload">
                <label>
                    {arquivo ? "Trocar documento" : "Selecionar documento"}
                    <input
                        type="file"
                        hidden
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={aoSelecionar}
                    />
                </label>
            </div>
        </div>
    );
}


function CampoComparacao({ campo, resultado }) {
    const statusCampo = resultado.campos?.[campo.chave];
    const info = statusCampo
        ? STATUS_CAMPO[statusCampo] ?? STATUS_CAMPO_PADRAO
        : STATUS_CAMPO.NAO_IDENTIFICADO;

    const valores = resultado.detalhes?.valores?.[campo.chave];
    const validacao = resultado.detalhes?.cpf_validacao;
    const similaridade = Math.min(
        Number(resultado.detalhes?.nome_similaridade ?? 0) * 100,
        100
    );

    const traduzir = (status) => VALIDACAO_CPF[status] || status || "Não informado";
    const cpfComRessalva =
        ["invalid", "ambiguous"].includes(validacao?.documento1) ||
        ["invalid", "ambiguous"].includes(validacao?.documento2);

    return (
        <div className="analise-card campo-card" data-nivel={info.nivel}>
            <div className="campo-topo">
                <h3>{campo.titulo}</h3>
                <span className="chip">{info.rotulo}</span>
            </div>

            {valores && (
                <div className="comparacao-valores">
                    <div className="comparacao-valor-linha">
                        <span>Documento 1</span>
                        <strong>{formatarValor(valores.documento1)}</strong>
                    </div>
                    <div className="comparacao-valor-linha">
                        <span>Documento 2</span>
                        <strong>{formatarValor(valores.documento2)}</strong>
                    </div>
                </div>
            )}

            {campo.chave === "nome" && (
                <>
                    <div className="barra">
                        <div style={{ width: `${similaridade}%` }}></div>
                    </div>
                    <p className="comparacao-similaridade">
                        Semelhança entre os nomes: <strong>{similaridade.toFixed(1)}%</strong>
                    </p>
                </>
            )}

            {campo.chave === "cpf" && (
                <div className="comparacao-validacao-cpf">
                    <div className="comparacao-validacao-linha">
                        <span>CPF do documento 1</span>
                        <strong>{traduzir(validacao?.documento1)}</strong>
                    </div>
                    <div className="comparacao-validacao-linha">
                        <span>CPF do documento 2</span>
                        <strong>{traduzir(validacao?.documento2)}</strong>
                    </div>

                    {cpfComRessalva && (
                        <p className="comparacao-alerta-validacao">
                            Os valores podem ser iguais, mas a validade matemática do CPF requer revisão.
                        </p>
                    )}
                </div>
            )}
        </div>
    );
}


// =========================================================
// PÁGINA
// =========================================================
function Analise() {
    const [etapa, setEtapa] = useState("upload"); // 'upload' | 'preview' | 'resultado' | 'relatorio'
    const [arquivo, setArquivo] = useState(null);
    const [preview, setPreview] = useState(null);
    const [dragAtivo, setDragAtivo] = useState(false);
    const [gerandoPDF, setGerandoPDF] = useState(false);

    const [resultadoAPI, setResultadoAPI] = useState(null);
    const [carregando, setCarregando] = useState(false);
    const [erro, setErro] = useState("");
    const [versaoImagem, setVersaoImagem] = useState(Date.now());
    const [mostrarTodosTrechos, setMostrarTodosTrechos] = useState(false);

    const [modoComparacao, setModoComparacao] = useState(false);
    const [documento2, setDocumento2] = useState(null);
    const [resultadoComparacao, setResultadoComparacao] = useState(null);
    const [detalheComparacao, setDetalheComparacao] = useState(false);


    // Libera da memória a URL temporária do preview quando ela é trocada
    useEffect(() => {
        return () => {
            if (preview) URL.revokeObjectURL(preview);
        };
    }, [preview]);


    // ---------------------------------------------------------
    // Seleção de arquivos
    // ---------------------------------------------------------
    const handleArquivo = (file) => {
        if (!file) return;
        setArquivo(file);
        setPreview(URL.createObjectURL(file));
        setErro("");
        setResultadoAPI(null);
        setEtapa("preview");
    };

    const limparComparacao = () => {
        setErro("");
        setResultadoComparacao(null);
        setDetalheComparacao(false);
    };

    const selecionarDocumento = (definir) => (e) => {
        const file = e.target.files[0];
        if (!file) return;
        definir(file);
        limparComparacao();
    };

    // Arrastar e soltar na comparação: preenche o documento 1 e, depois, o 2
    const handleDropComparacao = (file) => {
        if (!file) return;
        limparComparacao();
        if (!arquivo) setArquivo(file);
        else setDocumento2(file);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setDragAtivo(false);
        if (carregando) return;

        const file = e.dataTransfer.files[0];
        if (modoComparacao) handleDropComparacao(file);
        else handleArquivo(file);
    };

    const trocarModo = (comparar) => {
        setModoComparacao(comparar);
        limparComparacao();

        if (comparar) {
            setResultadoAPI(null);
            setEtapa("upload");
        } else {
            setDocumento2(null);
        }
    };

    const novaAnalise = () => {
        setArquivo(null);
        setPreview(null);
        setResultadoAPI(null);
        setMostrarTodosTrechos(false);
        setErro("");
        setEtapa("upload");
    };


    // ---------------------------------------------------------
    // Chamadas à API
    // ---------------------------------------------------------
    const compararDocumentos = async () => {
        if (!arquivo || !documento2) {
            setErro("Selecione os dois documentos para comparar.");
            return;
        }

        setCarregando(true);
        limparComparacao();

        const dados = new FormData();
        dados.append("documento1", arquivo);
        dados.append("documento2", documento2);

        try {
            const resposta = await fetchComTimeout(`${API_URL}/valid/comparar`, {
                method: "POST",
                body: dados
            });
            const json = await resposta.json();

            if (!resposta.ok) {
                throw new Error(json.erro || "Erro ao comparar documentos.");
            }

            setResultadoComparacao(json.comparacao);
        } catch (err) {
            setErro(mensagemDeErro(err, "Não foi possível conectar ao comparador."));
        } finally {
            setCarregando(false);
        }
    };

    const analisarDocumento = async () => {
        if (!arquivo) {
            setErro("Selecione um documento antes de iniciar.");
            return;
        }

        setCarregando(true);
        setErro("");

        const dados = new FormData();
        dados.append("imagem", arquivo);

        try {
            const resposta = await fetchComTimeout(`${API_URL}/analisar`, {
                method: "POST",
                body: dados
            });
            const dadosRetornados = await resposta.json();

            if (!resposta.ok) {
                throw new Error(
                    dadosRetornados.erro || "Erro durante a análise do documento."
                );
            }

            await salvarNoHistorico(arquivo, dadosRetornados);

            setResultadoAPI(dadosRetornados);
            setVersaoImagem(Date.now());
            setMostrarTodosTrechos(false);
            setEtapa("resultado");
        } catch (err) {
            setErro(mensagemDeErro(err, "Não foi possível conectar ao servidor."));
        } finally {
            setCarregando(false);
        }
    };

    const baixarPDF = async () => {
        if (!resultadoAPI) {
            setErro("Nenhum resultado de análise disponível.");
            return;
        }

        setGerandoPDF(true);
        setErro("");

        try {
            const resposta = await fetchComTimeout(`${API_URL}/gerar_pdf`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...resultadoAPI,
                    nome_arquivo: arquivo?.name || "documento_analisado"
                })
            });

            if (!resposta.ok) {
                let mensagem = "Erro ao gerar o relatório PDF.";
                try {
                    const erroAPI = await resposta.json();
                    mensagem = erroAPI.erro || mensagem;
                } catch {
                    // mantém a mensagem padrão
                }
                throw new Error(mensagem);
            }

            const blob = await resposta.blob();
            const url = window.URL.createObjectURL(blob);

            const link = document.createElement("a");
            link.href = url;
            link.download = `VALID_Relatorio_${arquivo?.name?.replace(/\.[^/.]+$/, "") || "documento"}.pdf`;
            document.body.appendChild(link);
            link.click();

            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch (err) {
            console.error("Erro ao gerar PDF:", err);
            setErro(mensagemDeErro(err, "Não foi possível gerar o relatório PDF."));
        } finally {
            setGerandoPDF(false);
        }
    };


    // ---------------------------------------------------------
    // Dados derivados do resultado
    // ---------------------------------------------------------
    const analise = resultadoAPI?.analise_global ?? {};
    const classificacao = analise.classification || "Não identificada";
    const veredito = VEREDITOS[obterStatus(classificacao)];
    const scoreFinal = Number(analise.combined_score) || 0;
    const trechos = resultadoAPI?.lista_anomalias ?? [];
    const trechosVisiveis = mostrarTodosTrechos
        ? trechos
        : trechos.slice(0, MAX_TRECHOS_VISIVEIS);

    const metricas = [
        {
            rotulo: "Índice de suspeita final",
            valor: formatar(scoreFinal, 2),
            ajuda: "Junta a análise da imagem e a do texto."
        },
        {
            rotulo: "Análise da imagem (pixels)",
            valor: formatar(analise.pixel_score, 2),
            ajuda: "Procura edições nos pixels do arquivo."
        },
        {
            rotulo: "Análise do texto (EOCR)",
            valor: formatar(analise.geometry_score, 2),
            ajuda: "Avalia ângulo e densidade das regiões de texto."
        },
        {
            rotulo: "Continuidade",
            valor: formatar(analise.continuity_score, 2),
            ajuda: "Mede variações bruscas de textura que podem indicar emendas."
        },
        {
            rotulo: "Maior bloco suspeito",
            valor: formatar(analise.max_block_score, 2),
            ajuda: "Pontuação da área da imagem que mais se destacou."
        },
        {
            rotulo: "Trechos em destaque",
            valor: trechos.length,
            ajuda: "Trechos de texto que merecem atenção."
        },
        {
            rotulo: "Regiões de texto lidas",
            valor: resultadoAPI?.total_regioes_texto ?? 0,
            ajuda: "Quantas partes de texto o VALID encontrou."
        },
        {
            rotulo: "Regiões de texto suspeitas",
            valor: analise.suspicious_geometry_regions ?? 0,
            ajuda: "Partes do texto com geometria fora do esperado."
        }
    ];

    // Passos do card lateral: acompanham a análise individual ou a comparação
    const passosStatus = modoComparacao
        ? [
            { rotulo: "Upload dos documentos", feito: Boolean(arquivo && documento2), andamento: false },
            { rotulo: "Comparação dos documentos", feito: Boolean(resultadoComparacao), andamento: carregando },
            { rotulo: "Relatório", feito: detalheComparacao, andamento: false }
        ]
        : [
            { rotulo: "Upload do arquivo", feito: etapa !== "upload", andamento: false },
            { rotulo: "Análise do documento", feito: ["resultado", "relatorio"].includes(etapa), andamento: carregando },
            { rotulo: "Relatório", feito: etapa === "relatorio", andamento: false }
        ];

    const infoComparacao = resultadoComparacao
        ? STATUS_COMPARACAO[resultadoComparacao.status] ?? STATUS_COMPARACAO_PADRAO
        : null;
    const compatibilidade = Number(resultadoComparacao?.compatibilidade ?? 0);


    return (
        <div
            className={`analise ${dragAtivo ? "drag-ativo" : ""}`}
            onDragOver={(e) => {
                e.preventDefault();
                setDragAtivo(true);
            }}
            onDragLeave={() => setDragAtivo(false)}
            onDrop={handleDrop}
        >
            <Header />

            <section className="secanalise">
                <h1 className="titulos-analise">Análise de Documento</h1>

                <div className="container row-analise">

                    {/* CARD PRINCIPAL */}
                    <div className="card-analise">

                        {/* ETAPA 1: UPLOAD / COMPARAÇÃO */}
                        {etapa === "upload" && (
                            <>
                                {!carregando && !resultadoComparacao && (
                                    <div className="modo-seletor" role="group" aria-label="Tipo de verificação">
                                        <button
                                            type="button"
                                            className={`modo-opcao ${!modoComparacao ? "ativo" : ""}`}
                                            aria-pressed={!modoComparacao}
                                            onClick={() => trocarModo(false)}
                                        >
                                            Análise individual
                                        </button>
                                        <button
                                            type="button"
                                            className={`modo-opcao ${modoComparacao ? "ativo" : ""}`}
                                            aria-pressed={modoComparacao}
                                            onClick={() => trocarModo(true)}
                                        >
                                            Comparar documentos
                                        </button>
                                    </div>
                                )}

                                {/* Carregando a comparação */}
                                {carregando && (
                                    <ScannerLoading
                                        eyebrow="COMPARAÇÃO EM ANDAMENTO"
                                        titulo="Comparando os documentos"
                                        texto="O VALID está lendo os dois arquivos e confrontando nome, CPF e data."
                                        status="Verificando nome, CPF e data..."
                                    />
                                )}

                                {/* Análise individual: envio do arquivo */}
                                {!carregando && !modoComparacao && (
                                    <div className="upload-area">
                                        <div className="icone-download"><LuDownload /></div>
                                        <h3>Arraste ou envie seu documento</h3>

                                        <div className="btn-upload">
                                            <label>
                                                Selecione um arquivo
                                                <input
                                                    type="file"
                                                    hidden
                                                    accept=".pdf,.jpg,.jpeg,.png"
                                                    onChange={(e) => handleArquivo(e.target.files[0])}
                                                />
                                            </label>
                                        </div>

                                        <p>JPG, PNG ou PDF</p>
                                    </div>
                                )}

                                {/* Comparação: escolha dos dois documentos */}
                                {!carregando && modoComparacao && !resultadoComparacao && (
                                    <div className="upload-area comparacao-area">
                                        <div className="comparacao-documentos-grid">
                                            <CartaoDocumento
                                                rotulo="Documento 1"
                                                arquivo={arquivo}
                                                vazio="Selecione o primeiro documento"
                                                descricao="Documento principal, usado como referência na comparação."
                                                aoSelecionar={selecionarDocumento(setArquivo)}
                                            />

                                            <div className="comparacao-conector">
                                                <div className="comparacao-linha"></div>
                                                <span>VS</span>
                                                <div className="comparacao-linha"></div>
                                            </div>

                                            <CartaoDocumento
                                                rotulo="Documento 2"
                                                arquivo={documento2}
                                                vazio="Selecione o segundo documento"
                                                descricao="Documento que terá nome, CPF e data confrontados com o primeiro."
                                                aoSelecionar={selecionarDocumento(setDocumento2)}
                                            />
                                        </div>

                                        {erro && <p className="msg-erro">{erro}</p>}

                                        <button
                                            className="btn-acao"
                                            onClick={compararDocumentos}
                                            disabled={!arquivo || !documento2}
                                        >
                                            Comparar documentos
                                        </button>
                                    </div>
                                )}

                                {/* Comparação: resultado resumido */}
                                {!carregando && resultadoComparacao && !detalheComparacao && (
                                    <div className="resultado-area comparacao-resultado-enter">
                                        <Veredito
                                            nivel={infoComparacao.nivel}
                                            Icone={infoComparacao.Icone}
                                            rotulo="Resultado da comparação"
                                            titulo={infoComparacao.titulo}
                                            resumo={infoComparacao.resumo}
                                        />

                                        <div className="indice" data-nivel={infoComparacao.nivel}>
                                            <strong>{compatibilidade.toFixed(1)}%</strong>
                                            <span>de compatibilidade entre os campos comparados</span>
                                        </div>

                                        <AvisoFerramenta />

                                        <div className="acoes-relatorio">
                                            <button
                                                className="btn-acao"
                                                onClick={() => setDetalheComparacao(true)}
                                            >
                                                Ver detalhes da comparação
                                            </button>
                                            <button
                                                className="btn-acao btn-secundario"
                                                onClick={() => {
                                                    setArquivo(null);
                                                    setDocumento2(null);
                                                    limparComparacao();
                                                }}
                                            >
                                                Comparar outros documentos
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* Comparação: detalhes */}
                                {!carregando && resultadoComparacao && detalheComparacao && (
                                    <div className="relatorio-area comparacao-resultado-enter">
                                        <div>
                                            <h2 className="titulo-secao">Detalhes da comparação</h2>
                                            <p className="bloco-sub">
                                                O VALID comparou nome, CPF e data encontrados nos dois documentos
                                                ({resultadoComparacao.detalhes?.campos_comparaveis ?? 0} de{" "}
                                                {CAMPOS_COMPARACAO.length} campos puderam ser comparados).
                                                O percentual mostra o quanto os dados coincidem e deve ser
                                                usado como apoio à triagem.
                                            </p>
                                        </div>

                                        <div className="comparacao-resumo-arquivos">
                                            <div className="metrica">
                                                <span>Documento 1</span>
                                                <strong>{arquivo?.name || "-"}</strong>
                                            </div>
                                            <div className="metrica">
                                                <span>Documento 2</span>
                                                <strong>{documento2?.name || "-"}</strong>
                                            </div>
                                        </div>

                                        <div className="analises-grid">
                                            {CAMPOS_COMPARACAO.map((campo) => (
                                                <CampoComparacao
                                                    key={campo.chave}
                                                    campo={campo}
                                                    resultado={resultadoComparacao}
                                                />
                                            ))}
                                        </div>

                                        <AvisoFerramenta />

                                        <div className="acoes-relatorio">
                                            <button
                                                className="btn-acao btn-secundario"
                                                onClick={() => setDetalheComparacao(false)}
                                            >
                                                Voltar para o resultado
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}


                        {/* ETAPA 2: PREVIEW E ENVIO */}
                        {etapa === "preview" && (
                            <div className={`preview-area ${carregando ? "modo-carregando" : ""}`}>
                                {carregando ? (
                                    <ScannerLoading
                                        eyebrow="ANÁLISE EM ANDAMENTO"
                                        titulo="Analisando seu documento"
                                        texto="O VALID está procurando sinais de edição na imagem e no texto do documento."
                                        status="Aguarde, isso pode levar alguns instantes..."
                                    />
                                ) : (
                                    <>
                                        <div className="preview-area-img">
                                            {arquivo?.type?.includes("image") ? (
                                                <img src={preview} alt="Documento" className="preview-img" />
                                            ) : arquivo?.type === "application/pdf" ? (
                                                <div className="pdf-preview">
                                                    <FaFilePdf size={80} color="#00A279" />
                                                    <h3>{arquivo.name}</h3>
                                                </div>
                                            ) : (
                                                <p>{arquivo?.name}</p>
                                            )}
                                        </div>

                                        {erro && <p className="msg-erro">{erro}</p>}

                                        <div className="acoes-relatorio">
                                            <button className="btn-acao" onClick={analisarDocumento}>
                                                Analisar documento
                                            </button>
                                            <button
                                                className="btn-acao btn-secundario"
                                                onClick={novaAnalise}
                                            >
                                                Escolher outro arquivo
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        )}


                        {/* ETAPA 3: RESULTADO EM LINGUAGEM SIMPLES */}
                        {etapa === "resultado" && (
                            <div className="resultado-area">
                                <Veredito
                                    nivel={veredito.nivel}
                                    Icone={veredito.Icone}
                                    rotulo={arquivo?.name ? `Arquivo analisado: ${arquivo.name}` : "Resultado da análise"}
                                    titulo={veredito.titulo}
                                    resumo={veredito.resumo}
                                />

                                <section className="bloco">
                                    <h3 className="bloco-titulo">Índice de suspeita</h3>
                                    <p className="bloco-sub">
                                        {formatar(scoreFinal, 0)} de 100. Quanto maior o índice, mais
                                        sinais de edição o VALID encontrou.
                                    </p>
                                    <MedidorSuspeita score={scoreFinal} nivel={veredito.nivel} />
                                </section>

                                <section className="bloco bloco-destaque" data-nivel={veredito.nivel}>
                                    <h3 className="bloco-titulo">O que fazer agora</h3>
                                    <ul className="passos">
                                        {veredito.passos.map((passo) => (
                                            <li key={passo}>{passo}</li>
                                        ))}
                                    </ul>
                                </section>

                                <section className="bloco">
                                    <h3 className="bloco-titulo">O que o VALID verificou</h3>
                                    <div className="verificacoes">
                                        {VERIFICACOES.map((v) => (
                                            <Verificacao
                                                key={v.chave}
                                                titulo={v.titulo}
                                                descricao={v.descricao}
                                                score={analise[v.chave]}
                                            />
                                        ))}
                                    </div>
                                </section>

                                {trechos.length > 0 && (
                                    <section className="bloco">
                                        <h3 className="bloco-titulo">Trechos que merecem atenção</h3>
                                        <p className="bloco-sub">
                                            Estes trechos do texto foram os que mais se destacaram.
                                            Confira-os no documento original.
                                        </p>

                                        <ul className="regioes-list">
                                            {trechosVisiveis.map((trecho, i) => {
                                                const nivel = nivelDoTexto(trecho.nivel_classificacao);
                                                return (
                                                    <li className="regiao" data-nivel={nivel} key={i}>
                                                        <strong>
                                                            {trecho.texto_identificado || `Trecho ${i + 1}`}
                                                        </strong>
                                                        <span className="chip">
                                                            Suspeita {ROTULO_SUSPEITA[nivel].toLowerCase()}
                                                        </span>
                                                    </li>
                                                );
                                            })}
                                        </ul>

                                        {trechos.length > MAX_TRECHOS_VISIVEIS && (
                                            <button
                                                type="button"
                                                className="btn-link"
                                                onClick={() => setMostrarTodosTrechos((v) => !v)}
                                            >
                                                {mostrarTodosTrechos
                                                    ? "Mostrar menos"
                                                    : `Mostrar todos (${trechos.length})`}
                                            </button>
                                        )}
                                    </section>
                                )}

                                <AvisoFerramenta />

                                {erro && <p className="msg-erro">{erro}</p>}

                                <div className="acoes-relatorio">
                                    <button className="btn-acao" onClick={baixarPDF} disabled={gerandoPDF}>
                                        <FaFilePdf className="icone-botao" />
                                        {gerandoPDF ? "Gerando PDF..." : "Baixar relatório PDF"}
                                    </button>
                                    <button
                                        className="btn-acao btn-secundario"
                                        onClick={() => {
                                            setErro("");
                                            setEtapa("relatorio");
                                        }}
                                    >
                                        Ver detalhes técnicos
                                    </button>
                                    <button className="btn-acao btn-secundario" onClick={novaAnalise}>
                                        Analisar outro documento
                                    </button>
                                </div>
                            </div>
                        )}


                        {/* ETAPA 4: DETALHES TÉCNICOS */}
                        {etapa === "relatorio" && (
                            <div className="relatorio-area">
                                <div>
                                    <h2 className="titulo-secao">Detalhes técnicos</h2>
                                    <p className="bloco-sub">
                                        Para quem quer conferir como o resultado foi calculado: números e
                                        imagens da análise.
                                    </p>
                                </div>

                                <div className="resultado-principal" data-nivel={veredito.nivel}>
                                    <div className="score-card">
                                        <div className="score-label">ÍNDICE FINAL</div>
                                        <div className="score">
                                            {formatar(scoreFinal, 1)}
                                            <small>%</small>
                                        </div>
                                        <div className="classificacao">Suspeita {classificacao.toLowerCase()}</div>
                                    </div>

                                    <div className="explicacao">
                                        <h3>Como o resultado é calculado</h3>
                                        <p>
                                            O índice final junta duas análises com o mesmo peso: a da imagem
                                            (pixels), com 50%, e a do texto (EOCR), com os outros 50%.
                                        </p>
                                    </div>
                                </div>

                                <section className="bloco">
                                    <h3 className="bloco-titulo">Imagens da análise</h3>
                                    <p className="bloco-sub">
                                        Cada imagem mostra, de um jeito diferente, onde o VALID procurou
                                        sinais de edição.
                                    </p>

                                    <div className="imagens-analise">
                                        {IMAGENS.map((img) => (
                                            <figure className="imagem-analise-card" key={img.arquivo}>
                                                <figcaption className="imagem-analise-header">
                                                    <h4>{img.titulo}</h4>
                                                    <p>{img.legenda}</p>
                                                </figcaption>
                                                <div className="imagem-container">
                                                    <img
                                                        src={`${API_URL}/results/${img.arquivo}?v=${versaoImagem}`}
                                                        alt={img.alt}
                                                        loading="lazy"
                                                    />
                                                </div>
                                            </figure>
                                        ))}
                                    </div>
                                </section>

                                <section className="bloco">
                                    <h3 className="bloco-titulo">Números da análise</h3>
                                    <div className="metricas">
                                        {metricas.map((m) => (
                                            <div className="metrica" key={m.rotulo}>
                                                <span>{m.rotulo}</span>
                                                <strong>{m.valor}</strong>
                                                <p>{m.ajuda}</p>
                                            </div>
                                        ))}
                                    </div>
                                </section>

                                {erro && <p className="msg-erro">{erro}</p>}

                                <div className="acoes-relatorio">
                                    <button className="btn-acao" onClick={baixarPDF} disabled={gerandoPDF}>
                                        <FaFilePdf className="icone-botao" />
                                        {gerandoPDF ? "Gerando PDF..." : "Baixar relatório PDF"}
                                    </button>
                                    <button
                                        className="btn-acao btn-secundario"
                                        onClick={() => {
                                            setErro("");
                                            setEtapa("resultado");
                                        }}
                                        disabled={gerandoPDF}
                                    >
                                        Voltar para o resultado
                                    </button>
                                </div>
                            </div>
                        )}

                    </div>


                    {/* CARD DE STATUS LATERAL */}
                    <div className="card-status">
                        <h3>Status</h3>
                        <hr />

                        {passosStatus.map((passo) => (
                            <div className="status-item" key={passo.rotulo}>
                                <div
                                    className={`status-circle ${passo.feito ? "concluido" : ""} ${passo.andamento ? "andamento" : ""}`}
                                >
                                    {passo.feito ? <FaCheck /> : passo.andamento && <span className="status-loader"></span>}
                                </div>
                                <span>{passo.rotulo}</span>
                            </div>
                        ))}
                    </div>

                </div>
            </section>

            <Footer />
            <BackToTop />
        </div>
    );
}


export default Analise;