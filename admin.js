
/* Controla a autenticação e a navegação do painel administrativo pelo Firebase. */
// Importa as conexões com autenticação e Firestore já configuradas.
import { auth, db } from "./firebase.js";

// Compartilha a validação de caminhos de imagens com a galeria pública.
import { getLocalGalleryPath } from "./gallery-utils.js";

// Importa as funções necessárias para autenticação e encerramento da sessão.
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";

// Importa as operações do Firestore usadas pelas áreas administrativas.
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

// UID da única conta autorizada a acessar a administração.
const UID_VALERIA = "lTpeBYIEhFaAYDWKnyN6scmh9c33";

// Lembra que a seção de informações deve ser reaberta após atualizar a mesma aba.
const CHAVE_SECAO_ADMINISTRATIVA = "valeria-beauty-admin-section";

// Localiza o formulário de login no HTML.
const formularioLogin = document.getElementById("login-form");

// Localiza os campos de e-mail e senha.
const campoEmail = document.getElementById("email");
const campoSenha = document.getElementById("password");

// Localiza os controles das telas de login e do painel.
const botaoLogin = document.getElementById("login-button");
const mensagemLogin = document.getElementById("login-message");
const telaLogin = document.getElementById("login-view");
const telaPainel = document.getElementById("dashboard-view");
const botaoSair = document.getElementById("logout-button");
const mensagemPainel = document.getElementById("dashboard-message");

// Localiza as áreas de estado e conteúdo da lista de serviços.
const estadoServicos = document.getElementById("services-state");
const listaServicos = document.getElementById("services-list");
const botaoAnteriorServicos = document.getElementById("services-page-prev");
const botaoProximaServicos = document.getElementById("services-page-next");
const statusPaginacaoServicos = document.getElementById("services-page-status");
const formularioServico = document.getElementById("service-form");
const campoNomeServico = document.getElementById("service-name");
const campoCategoriaServico = document.getElementById("service-category");
const campoPrecoServico = document.getElementById("service-price");
const tituloFormularioServico = document.getElementById("service-form-title");
const botaoSalvarServico = document.getElementById("service-save-button");
const botaoCancelarEdicaoServico = document.getElementById("service-cancel-button");
const mensagemFormularioServico = document.getElementById("service-form-message");

// Localiza os controles do cadastro, da prévia e da lista administrativa da galeria.
const estadoGaleria = document.getElementById("gallery-load-state");
const botaoTentarCarregarGaleria = document.getElementById("gallery-retry-button");
const listaGaleria = document.getElementById("gallery-list");
const botaoAnteriorGaleria = document.getElementById("gallery-page-prev");
const botaoProximaGaleria = document.getElementById("gallery-page-next");
const statusPaginacaoGaleria = document.getElementById("gallery-page-status");
const formularioGaleria = document.getElementById("gallery-form");
const campoCaminhoGaleria = document.getElementById("gallery-path");
const campoDescricaoGaleria = document.getElementById("gallery-description");
const imagemPreviaGaleria = document.getElementById("gallery-preview-image");
const estadoPreviaGaleria = document.getElementById("gallery-preview-state");
const tituloFormularioGaleria = document.getElementById("gallery-form-title");
const botaoSalvarGaleria = document.getElementById("gallery-save-button");
const botaoCancelarEdicaoGaleria = document.getElementById("gallery-cancel-button");
const mensagemFormularioGaleria = document.getElementById("gallery-form-message");

// Mantém um formulário e um estado independentes para cada documento de categoria.
const formulariosOrientacoes = {
  cera: {
    formulario: document.getElementById("wax-guidance-form"),
    campoAntes: document.getElementById("wax-guidance-before"),
    campoDepois: document.getElementById("wax-guidance-after"),
    botaoSalvar: document.getElementById("wax-guidance-save-button"),
    mensagem: document.getElementById("wax-guidance-message"),
    carregada: false,
    requisicao: null,
    operacaoEmAndamento: false
  },
  sobrancelhas: {
    formulario: document.getElementById("brow-guidance-form"),
    campoAntes: document.getElementById("brow-guidance-before"),
    campoDepois: document.getElementById("brow-guidance-after"),
    botaoSalvar: document.getElementById("brow-guidance-save-button"),
    mensagem: document.getElementById("brow-guidance-message"),
    carregada: false,
    requisicao: null,
    operacaoEmAndamento: false
  }
};

// Localiza o formulário e as mensagens da área administrativa de comentários.
const estadoComentarios = document.getElementById("comments-state");
const listaComentarios = document.getElementById("comments-list");
const botaoAnteriorComentarios = document.getElementById("comments-page-prev");
const botaoProximaComentarios = document.getElementById("comments-page-next");
const statusPaginacaoComentarios = document.getElementById("comments-page-status");
const formularioComentario = document.getElementById("comment-form");
const campoNomeComentario = document.getElementById("comment-name");
const campoTextoComentario = document.getElementById("comment-text");
const campoAvaliacaoComentario = document.getElementById("comment-rating");
const tituloFormularioComentario = document.getElementById("comment-form-title");
const botaoSalvarComentario = document.getElementById("comment-save-button");
const botaoCancelarEdicaoComentario = document.getElementById("comment-cancel-button");
const mensagemFormularioComentario = document.getElementById("comment-form-message");

// Localiza o formulário e o estado do documento público de informações do negócio.
const estadoInformacoes = document.getElementById("information-state");
const botaoTentarCarregarInformacoes = document.getElementById("information-retry-button");
const formularioInformacoes = document.getElementById("information-form");
const campoNomeEstabelecimento = document.getElementById("information-name");
const campoWhatsappEstabelecimento = document.getElementById("information-whatsapp");
const campoInstagramEstabelecimento = document.getElementById("information-instagram");
const campoEnderecoEstabelecimento = document.getElementById("information-address");
const tituloFormularioInformacoes = document.getElementById("information-form-title");
const botaoSalvarInformacoes = document.getElementById("information-save-button");
const mensagemFormularioInformacoes = document.getElementById("information-form-message");

// Localiza os botões de navegação e os painéis de conteúdo correspondentes.
const botoesNavegacao = document.querySelectorAll(".nav-button");
const paineisConteudo = document.querySelectorAll(".content-panel");

// Guarda o estado da lista e impede operações simultâneas na mesma sessão.
let servicosCarregados = false;
let requisicaoServicos = null;
let servicoEmEdicao = null;
let operacaoServicoEmAndamento = false;
let galeriaCarregada = false;
let requisicaoGaleria = null;
let imagemGaleriaEmEdicao = null;
let operacaoGaleriaEmAndamento = false;
let versaoPreviaGaleria = 0;
let caminhoPreviaCarregada = null;
let erroPreviaGaleria = false;
let comentariosCarregados = false;
let requisicaoComentarios = null;
let comentarioEmEdicao = null;
let operacaoComentarioEmAndamento = false;
// Guarda o estado da consulta e da gravação do documento único de informações.
let requisicaoInformacoes = null;
let informacoesCarregadas = false;
let documentoInformacoesExiste = false;
let operacaoInformacoesEmAndamento = false;

// Mantém a página e os documentos carregados independentemente em cada histórico.
const paginacoesAdministrativas = {
  servicos: {
    pagina: 1,
    itensPorPagina: 2,
    documentos: [],
    lista: listaServicos,
    botaoAnterior: botaoAnteriorServicos,
    botaoProxima: botaoProximaServicos,
    status: statusPaginacaoServicos
  },
  galeria: {
    pagina: 1,
    itensPorPagina: 3,
    documentos: [],
    lista: listaGaleria,
    botaoAnterior: botaoAnteriorGaleria,
    botaoProxima: botaoProximaGaleria,
    status: statusPaginacaoGaleria
  },
  comentarios: {
    pagina: 1,
    itensPorPagina: 2,
    documentos: [],
    lista: listaComentarios,
    botaoAnterior: botaoAnteriorComentarios,
    botaoProxima: botaoProximaComentarios,
    status: statusPaginacaoComentarios
  }
};

// Confere a conta atual antes de qualquer consulta ou gravação administrativa.
function proprietariaAutorizada() {
  return Boolean(auth.currentUser && auth.currentUser.uid === UID_VALERIA);
}

// Renderiza uma página sem alterar os dados nem as coleções do Firebase.
function renderizarPaginacao(chave, criarCartao) {
  const configuracao = paginacoesAdministrativas[chave];
  const totalPaginas = Math.max(
    1,
    Math.ceil(configuracao.documentos.length / configuracao.itensPorPagina)
  );

  configuracao.pagina = Math.min(Math.max(1, configuracao.pagina), totalPaginas);
  const inicio = (configuracao.pagina - 1) * configuracao.itensPorPagina;
  const documentosPagina = configuracao.documentos.slice(
    inicio,
    inicio + configuracao.itensPorPagina
  );

  configuracao.lista.replaceChildren(...documentosPagina.map(criarCartao));
  configuracao.status.textContent =
    `Página ${configuracao.pagina} de ${totalPaginas}`;
  configuracao.botaoAnterior.disabled = configuracao.pagina <= 1;
  configuracao.botaoProxima.disabled = configuracao.pagina >= totalPaginas;
}

// Os eventos usam configurações próprias para que cada aba mantenha sua página atual.
botaoAnteriorServicos.addEventListener("click", () => {
  const configuracao = paginacoesAdministrativas.servicos;
  // Impede valores menores que 1 e limita a mudança à página atual existente.
  if (configuracao.pagina > 1) {
    configuracao.pagina -= 1;
    renderizarPaginacao("servicos", criarCartaoServico);
  }
});

botaoProximaServicos.addEventListener("click", () => {
  const configuracao = paginacoesAdministrativas.servicos;
  const totalPaginas = Math.max(
    1,
    Math.ceil(configuracao.documentos.length / configuracao.itensPorPagina)
  );
  // Avança somente enquanto existir uma próxima página real.
  if (configuracao.pagina < totalPaginas) {
    configuracao.pagina += 1;
    renderizarPaginacao("servicos", criarCartaoServico);
  }
});

botaoAnteriorGaleria.addEventListener("click", () => {
  paginacoesAdministrativas.galeria.pagina -= 1;
  renderizarPaginacao("galeria", criarCartaoGaleria);
});

botaoProximaGaleria.addEventListener("click", () => {
  paginacoesAdministrativas.galeria.pagina += 1;
  renderizarPaginacao("galeria", criarCartaoGaleria);
});

botaoAnteriorComentarios.addEventListener("click", () => {
  const configuracao = paginacoesAdministrativas.comentarios;
  // Mantém o histórico de comentários na primeira página como limite mínimo.
  if (configuracao.pagina > 1) {
    configuracao.pagina -= 1;
    renderizarPaginacao("comentarios", criarCartaoComentario);
  }
});

botaoProximaComentarios.addEventListener("click", () => {
  const configuracao = paginacoesAdministrativas.comentarios;
  const totalPaginas = Math.max(
    1,
    Math.ceil(configuracao.documentos.length / configuracao.itensPorPagina)
  );
  // Avança somente enquanto houver registros suficientes para a próxima página.
  if (configuracao.pagina < totalPaginas) {
    configuracao.pagina += 1;
    renderizarPaginacao("comentarios", criarCartaoComentario);
  }
});

// Exibe a tela de login e oculta o painel.
function mostrarLogin() {
  telaLogin.hidden = false;
  telaPainel.hidden = true;
  limparFormularioServico();
  // Remove os registros e a prévia da galeria antes de encerrar a sessão administrativa.
  limparDadosGaleriaDaSessao();
  limparFormularioComentario();
  // Apaga valores e bloqueia os formulários de orientação ao encerrar a sessão.
  limparFormulariosOrientacoes();
  // Remove os dados carregados antes de encerrar ou trocar a sessão administrativa.
  limparFormularioInformacoes();
}

// Exibe o painel, restaura Informações quando necessário e limpa avisos anteriores.
function mostrarPainel() {
  telaLogin.hidden = true;
  telaPainel.hidden = false;
  // Evita exibir uma confirmação de login antigo ao retornar à tela de acesso.
  mensagemLogin.textContent = "";
  mensagemPainel.textContent = "";
  ativarSecao(obterSecaoPainelSalva());
}

// Restaura Informações apenas se a seção ainda existir no menu administrativo.
function obterSecaoPainelSalva() {
  try {
    const secaoSalva = window.sessionStorage.getItem(CHAVE_SECAO_ADMINISTRATIVA);
    const secaoExistente = Array.from(botoesNavegacao).some(
      (botao) => botao.dataset.section === secaoSalva
    );

    return secaoSalva === "information" && secaoExistente
      ? "information"
      : "overview";
  } catch (erro) {
    // Mantém a navegação funcional caso o navegador bloqueie o armazenamento da sessão.
    console.error("Não foi possível restaurar a seção administrativa salva:", erro);
    return "overview";
  }
}

// Exibe mensagens acessíveis de carregamento, lista vazia ou falha da consulta.
function atualizarEstadoServicos(mensagem) {
  estadoServicos.textContent = mensagem;
  estadoServicos.hidden = mensagem.length === 0;
}

// Exibe mensagens associadas ao formulário sem esconder erros de gravação.
function atualizarMensagemFormulario(mensagem) {
  mensagemFormularioServico.textContent = mensagem;
}

// Alterna os campos do formulário enquanto uma gravação está em andamento.
function definirFormularioOcupado(ocupado) {
  operacaoServicoEmAndamento = ocupado;
  campoNomeServico.disabled = ocupado;
  campoCategoriaServico.disabled = ocupado;
  campoPrecoServico.disabled = ocupado;
  botaoSalvarServico.disabled = ocupado;
  botaoCancelarEdicaoServico.disabled = ocupado;
}

// Atualiza os rótulos e a ação principal conforme o modo de cadastro ou edição.
function atualizarModoFormulario() {
  const estaEditando = Boolean(servicoEmEdicao);
  tituloFormularioServico.textContent = estaEditando
    ? "Editar serviço"
    : "Adicionar serviço";
  botaoSalvarServico.textContent = estaEditando
    ? "Salvar alterações"
    : "Adicionar serviço";
  botaoCancelarEdicaoServico.hidden = !estaEditando;
}

// Limpa os campos e retorna o formulário ao modo de cadastro.
function limparFormularioServico() {
  formularioServico.reset();
  servicoEmEdicao = null;
  atualizarModoFormulario();
  atualizarMensagemFormulario("");
}

// Atualiza a mensagem acessível de um formulário de orientação.
function atualizarMensagemOrientacoes(configuracao, mensagem) {
  configuracao.mensagem.textContent = mensagem;
}

// Libera a edição somente após a leitura e enquanto a conta autorizada estiver ativa.
function atualizarControlesOrientacoes(configuracao) {
  const habilitado =
    configuracao.carregada &&
    proprietariaAutorizada() &&
    !configuracao.operacaoEmAndamento;
  configuracao.campoAntes.disabled = !habilitado;
  configuracao.campoDepois.disabled = !habilitado;
  configuracao.botaoSalvar.disabled = !habilitado;
}

// Limpa dados da categoria e exige uma nova leitura em outra sessão administrativa.
function limparFormulariosOrientacoes() {
  Object.values(formulariosOrientacoes).forEach((configuracao) => {
    configuracao.campoAntes.value = "";
    configuracao.campoDepois.value = "";
    configuracao.carregada = false;
    configuracao.operacaoEmAndamento = false;
    atualizarMensagemOrientacoes(configuracao, "");
    atualizarControlesOrientacoes(configuracao);
  });
}

// Lê um único documento por categoria e deixa o formulário pronto para edição.
async function carregarOrientacoesCategoria(categoria) {
  const configuracao = formulariosOrientacoes[categoria];

  if (!configuracao) {
    console.error("A categoria solicitada para carregar orientações é inválida.");
    return false;
  }

  if (!proprietariaAutorizada()) {
    configuracao.carregada = false;
    atualizarMensagemOrientacoes(
      configuracao,
      "Entre com a conta autorizada para consultar as orientações."
    );
    atualizarControlesOrientacoes(configuracao);
    return false;
  }

  if (configuracao.carregada) {
    return true;
  }

  if (configuracao.requisicao) {
    return await configuracao.requisicao;
  }

  atualizarMensagemOrientacoes(configuracao, "Carregando orientações...");
  atualizarControlesOrientacoes(configuracao);

  configuracao.requisicao = (async () => {
    try {
      const resultado = await getDoc(doc(db, "orientacoes", categoria));

      if (!proprietariaAutorizada()) {
        atualizarMensagemOrientacoes(
          configuracao,
          "A sessão autorizada terminou; entre novamente para carregar as orientações."
        );
        return false;
      }

      const dados = resultado.exists() ? resultado.data() : {};
      const antesValido = typeof dados.antes === "string";
      const depoisValido = typeof dados.depois === "string";
      configuracao.campoAntes.value = antesValido ? dados.antes : "";
      configuracao.campoDepois.value = depoisValido ? dados.depois : "";
      configuracao.carregada = true;
      atualizarControlesOrientacoes(configuracao);

      if (!resultado.exists()) {
        atualizarMensagemOrientacoes(
          configuracao,
          "Ainda não há orientações salvas para esta categoria. Preencha os campos e salve."
        );
      } else if (!antesValido || !depoisValido) {
        atualizarMensagemOrientacoes(
          configuracao,
          "O documento existente está incompleto. Revise os dois campos antes de salvar."
        );
      } else {
        atualizarMensagemOrientacoes(configuracao, "");
      }

      return true;
    } catch (erro) {
      // Comunica falhas de leitura sem habilitar a gravação sobre dados não carregados.
      console.error(`Não foi possível carregar as orientações de ${categoria}:`, erro);
      atualizarMensagemOrientacoes(
        configuracao,
        "Não foi possível carregar as orientações. Saia e abra esta seção novamente para tentar de novo."
      );
      return false;
    } finally {
      configuracao.requisicao = null;
    }
  })();

  return await configuracao.requisicao;
}

// Valida o tamanho dos dois textos antes de gravar o documento compartilhado.
function validarOrientacoesCategoria(configuracao) {
  const antes = configuracao.campoAntes.value.trim();
  const depois = configuracao.campoDepois.value.trim();
  configuracao.campoAntes.setCustomValidity(
    antes.length > 5000 ? "Use no máximo 5000 caracteres neste campo." : ""
  );
  configuracao.campoDepois.setCustomValidity(
    depois.length > 5000 ? "Use no máximo 5000 caracteres neste campo." : ""
  );

  if (!configuracao.formulario.checkValidity()) {
    configuracao.formulario.reportValidity();
    return null;
  }

  return { antes, depois };
}

// Salva uma categoria em seu próprio documento e mostra o resultado da operação.
async function salvarOrientacoesCategoria(evento) {
  evento.preventDefault();
  const categoria = evento.currentTarget.dataset.guidanceCategory;
  const configuracao = formulariosOrientacoes[categoria];

  if (!configuracao) {
    console.error("A categoria solicitada para salvar orientações é inválida.");
    return;
  }

  if (!proprietariaAutorizada()) {
    atualizarMensagemOrientacoes(
      configuracao,
      "Somente a conta autorizada pode salvar orientações."
    );
    return;
  }

  if (!configuracao.carregada) {
    atualizarMensagemOrientacoes(
      configuracao,
      "Carregue as orientações antes de salvar. Abra a seção novamente para tentar."
    );
    return;
  }

  if (configuracao.operacaoEmAndamento) {
    return;
  }

  const dados = validarOrientacoesCategoria(configuracao);

  if (!dados) {
    return;
  }

  configuracao.operacaoEmAndamento = true;
  configuracao.botaoSalvar.textContent = "Salvando...";
  atualizarControlesOrientacoes(configuracao);
  atualizarMensagemOrientacoes(configuracao, "Salvando orientações...");

  try {
    // Grava somente os dois textos no documento da categoria atualmente selecionada.
    await setDoc(doc(db, "orientacoes", categoria), dados);
    atualizarMensagemOrientacoes(configuracao, "Orientações salvas com sucesso.");
  } catch (erro) {
    // Expõe falhas de conexão ou permissão sem apresentar a gravação como bem-sucedida.
    console.error(`Não foi possível salvar as orientações de ${categoria}:`, erro);
    atualizarMensagemOrientacoes(
      configuracao,
      "Não foi possível salvar. Verifique a conexão e as regras do Firestore."
    );
  } finally {
    configuracao.operacaoEmAndamento = false;
    configuracao.botaoSalvar.textContent =
      categoria === "cera"
        ? "Salvar orientações de epilação"
        : "Salvar orientações de Sobrancelhas";
    atualizarControlesOrientacoes(configuracao);
  }
}

// Converte preços em reais, aceitando vírgula decimal e prefixo monetário opcional.
function converterPreco(valor) {
  const texto = valor.trim().replace(/^R\$\s*/i, "").replace(/\s/g, "");

  if (!texto) {
    return null;
  }

  const normalizado = texto.includes(",")
    ? texto.includes(".")
      ? texto.replace(/\./g, "").replace(",", ".")
      : texto.replace(",", ".")
    : texto;

  if (!/^\d+(?:\.\d{1,2})?$/.test(normalizado)) {
    return null;
  }

  const preco = Number(normalizado);

  if (!Number.isFinite(preco) || preco < 0 || preco > 1000000) {
    return null;
  }

  return Math.round(preco * 100) / 100;
}

// Formata valores numéricos em reais e preserva preços já armazenados como texto.
function formatarPreco(preco) {
  if (typeof preco === "number" && Number.isFinite(preco)) {
    return preco.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL"
    });
  }

  if (typeof preco === "string" && preco.trim()) {
    return preco.trim();
  }

  return "Não informado";
}

// Mostra estados de carregamento, coleção vazia ou erro da galeria administrativa.
function atualizarEstadoGaleria(mensagem) {
  estadoGaleria.textContent = mensagem;
  estadoGaleria.hidden = mensagem.length === 0;
}

// Comunica os resultados do cadastro, edição e exclusão de imagens.
function atualizarMensagemFormularioGaleria(mensagem) {
  mensagemFormularioGaleria.textContent = mensagem;
}

// Alterna os campos e ações enquanto uma gravação ou exclusão está em andamento.
function atualizarControlesFormularioGaleria() {
  campoCaminhoGaleria.disabled = operacaoGaleriaEmAndamento;
  campoDescricaoGaleria.disabled = operacaoGaleriaEmAndamento;
  botaoSalvarGaleria.disabled =
    operacaoGaleriaEmAndamento || !galeriaCarregada || !proprietariaAutorizada();
  botaoCancelarEdicaoGaleria.disabled = operacaoGaleriaEmAndamento;
}

// Bloqueia o formulário durante uma operação e restaura os controles ao terminar.
function definirFormularioGaleriaOcupado(ocupado) {
  operacaoGaleriaEmAndamento = ocupado;
  atualizarControlesFormularioGaleria();
}

// Atualiza os rótulos do formulário conforme o modo de cadastro ou edição.
function atualizarModoFormularioGaleria() {
  const estaEditando = Boolean(imagemGaleriaEmEdicao);
  tituloFormularioGaleria.textContent = estaEditando
    ? "Editar imagem"
    : "Adicionar imagem";
  botaoSalvarGaleria.textContent = estaEditando
    ? "Salvar alterações"
    : "Adicionar imagem";
  botaoCancelarEdicaoGaleria.hidden = !estaEditando;
}

// Remove a prévia anterior e invalida eventos de carregamento ainda pendentes.
function limparPreviaGaleria(mensagem = "Informe um caminho válido para ver a prévia.") {
  versaoPreviaGaleria += 1;
  caminhoPreviaCarregada = null;
  erroPreviaGaleria = false;
  imagemPreviaGaleria.onload = null;
  imagemPreviaGaleria.onerror = null;
  imagemPreviaGaleria.removeAttribute("src");
  imagemPreviaGaleria.alt = "";
  imagemPreviaGaleria.hidden = true;
  estadoPreviaGaleria.textContent = mensagem;
}

// Carrega uma prévia local apenas para caminhos que também serão aceitos pelo site público.
function atualizarPreviaGaleria() {
  const caminho = getLocalGalleryPath(campoCaminhoGaleria.value);
  const valorInformado = campoCaminhoGaleria.value.trim();
  const versaoAtual = versaoPreviaGaleria + 1;
  versaoPreviaGaleria = versaoAtual;
  caminhoPreviaCarregada = null;
  erroPreviaGaleria = false;
  imagemPreviaGaleria.onload = null;
  imagemPreviaGaleria.onerror = null;
  imagemPreviaGaleria.removeAttribute("src");
  imagemPreviaGaleria.hidden = true;

  if (!caminho) {
    campoCaminhoGaleria.setCustomValidity(
      valorInformado ? "Use um caminho direto para uma imagem dentro de imagens/." : ""
    );
    estadoPreviaGaleria.textContent = valorInformado
      ? "Caminho inválido. Use imagens/nome-do-arquivo.png ou outro formato de imagem aceito."
      : "Informe um caminho válido para ver a prévia.";
    return;
  }

  campoCaminhoGaleria.setCustomValidity("");
  imagemPreviaGaleria.alt =
    campoDescricaoGaleria.value.trim() || "Prévia da imagem da galeria";
  imagemPreviaGaleria.hidden = false;
  estadoPreviaGaleria.textContent = "Carregando prévia da imagem local...";

  imagemPreviaGaleria.onload = () => {
    if (versaoPreviaGaleria !== versaoAtual) {
      return;
    }

    if (imagemPreviaGaleria.naturalWidth === 0) {
      erroPreviaGaleria = true;
      imagemPreviaGaleria.hidden = true;
      estadoPreviaGaleria.textContent = "O arquivo não contém uma imagem válida.";
      return;
    }

    caminhoPreviaCarregada = caminho;
    estadoPreviaGaleria.textContent = "Prévia carregada do arquivo local.";
  };

  imagemPreviaGaleria.onerror = () => {
    if (versaoPreviaGaleria !== versaoAtual) {
      return;
    }

    erroPreviaGaleria = true;
    imagemPreviaGaleria.hidden = true;
    estadoPreviaGaleria.textContent =
      "Não foi possível carregar esse arquivo. Confira se ele existe dentro de imagens/.";
  };

  imagemPreviaGaleria.src = caminho;
}

// Limpa o formulário e a prévia sem remover ou alterar documentos do Firestore.
function limparFormularioGaleria() {
  formularioGaleria.reset();
  imagemGaleriaEmEdicao = null;
  campoCaminhoGaleria.setCustomValidity("");
  campoDescricaoGaleria.setCustomValidity("");
  atualizarModoFormularioGaleria();
  atualizarMensagemFormularioGaleria("");
  limparPreviaGaleria();
  atualizarControlesFormularioGaleria();
}

// Descarta a lista administrativa e os valores visíveis ao encerrar a sessão.
function limparDadosGaleriaDaSessao() {
  galeriaCarregada = false;
  operacaoGaleriaEmAndamento = false;
  listaGaleria.replaceChildren();
  atualizarEstadoGaleria("");
  botaoTentarCarregarGaleria.hidden = true;
  limparFormularioGaleria();
}

// Constrói um cartão seguro e permite revisar até os registros que não aparecem no site.
function criarCartaoGaleria(documento) {
  const imagem = documento.data();
  const caminho = getLocalGalleryPath(imagem.caminho);
  const descricao =
    typeof imagem.descricao === "string" ? imagem.descricao.trim() : "";
  const cartao = document.createElement("article");
  cartao.className = "gallery-admin-card";

  const previa = document.createElement("img");
  previa.className = "gallery-admin-card-image";
  previa.alt = descricao || "Imagem sem descrição";
  previa.loading = "lazy";
  previa.hidden = true;

  const estadoImagem = document.createElement("p");
  estadoImagem.className = "gallery-admin-card-state";

  if (caminho) {
    // Exibe o espaço da miniatura para que a imagem lazy-loaded possa iniciar o carregamento.
    previa.hidden = false;
    previa.addEventListener("load", () => {
      estadoImagem.hidden = true;
    });
    previa.addEventListener("error", () => {
      previa.hidden = true;
      estadoImagem.textContent = "Arquivo local não encontrado; não será exibido no site.";
      estadoImagem.hidden = false;
    });
    previa.src = caminho;
  } else {
    estadoImagem.textContent = "Caminho inválido; a imagem não será exibida no site.";
    estadoImagem.hidden = false;
  }

  const titulo = document.createElement("h2");
  titulo.textContent = descricao || "Imagem sem descrição";

  const caminhoExibido = document.createElement("p");
  caminhoExibido.className = "gallery-admin-card-path";
  caminhoExibido.textContent =
    typeof imagem.caminho === "string" && imagem.caminho.trim()
      ? `Caminho: ${imagem.caminho.trim()}`
      : "Caminho não informado.";

  const acoes = document.createElement("div");
  acoes.className = "service-admin-actions";

  const botaoEditar = document.createElement("button");
  botaoEditar.type = "button";
  botaoEditar.className = "service-action-button";
  botaoEditar.textContent = "Editar";
  botaoEditar.addEventListener("click", () => {
    iniciarEdicaoGaleria(documento.id, imagem);
  });

  const botaoExcluir = document.createElement("button");
  botaoExcluir.type = "button";
  botaoExcluir.className = "service-action-button service-delete-button";
  botaoExcluir.textContent = "Excluir";
  botaoExcluir.addEventListener("click", () => {
    void excluirImagemGaleria(documento.id, descricao || "imagem sem descrição");
  });

  acoes.append(botaoEditar, botaoExcluir);
  cartao.append(previa, estadoImagem, titulo, caminhoExibido, acoes);
  return cartao;
}

// Carrega a coleção galeria somente para a sessão autenticada e atualiza os cartões.
async function carregarGaleria(forcarAtualizacao = false) {
  if (!proprietariaAutorizada()) {
    atualizarEstadoGaleria("Entre com a conta autorizada para consultar a galeria.");
    botaoTentarCarregarGaleria.hidden = true;
    return false;
  }

  if (galeriaCarregada && !forcarAtualizacao) {
    renderizarPaginacao("galeria", criarCartaoGaleria);
    return true;
  }

  if (requisicaoGaleria) {
    const resultadoEmAndamento = await requisicaoGaleria;
    if (!forcarAtualizacao) {
      return resultadoEmAndamento;
    }
  }

  atualizarEstadoGaleria("Carregando imagens...");
  botaoTentarCarregarGaleria.hidden = true;
  requisicaoGaleria = (async () => {
    try {
      const resultado = await getDocs(collection(db, "galeria"));
      if (!proprietariaAutorizada()) {
        atualizarEstadoGaleria("Entre com a conta autorizada para consultar a galeria.");
        return false;
      }

      const registrosInvalidos = resultado.docs.filter((documento) => {
        const imagem = documento.data();
        return !getLocalGalleryPath(imagem.caminho) ||
          typeof imagem.descricao !== "string" ||
          !imagem.descricao.trim();
      }).length;

      paginacoesAdministrativas.galeria.documentos = resultado.docs;
      renderizarPaginacao("galeria", criarCartaoGaleria);
      galeriaCarregada = true;

      if (resultado.empty) {
        atualizarEstadoGaleria("Nenhuma imagem cadastrada.");
      } else if (registrosInvalidos > 0) {
        atualizarEstadoGaleria(
          `${registrosInvalidos} registro(s) precisam de revisão; confira caminho e descrição.`
        );
      } else {
        atualizarEstadoGaleria("");
      }

      return true;
    } catch (erro) {
      // Comunica falhas sem apresentar uma coleção inacessível como vazia.
      console.error("Não foi possível carregar a galeria do Firestore:", erro);
      atualizarEstadoGaleria("Não foi possível carregar a galeria. Tente novamente.");
      botaoTentarCarregarGaleria.hidden = false;
      return false;
    } finally {
      requisicaoGaleria = null;
      atualizarControlesFormularioGaleria();
    }
  })();

  return await requisicaoGaleria;
}

// Preenche o formulário com o registro selecionado para editar caminho ou descrição.
function iniciarEdicaoGaleria(id, imagem) {
  if (!proprietariaAutorizada() || operacaoGaleriaEmAndamento) {
    return;
  }

  imagemGaleriaEmEdicao = id;
  campoCaminhoGaleria.value =
    typeof imagem.caminho === "string" ? imagem.caminho : "";
  campoDescricaoGaleria.value =
    typeof imagem.descricao === "string" ? imagem.descricao : "";
  atualizarModoFormularioGaleria();
  atualizarMensagemFormularioGaleria("");
  atualizarPreviaGaleria();
  campoCaminhoGaleria.focus();
}

// Valida a descrição, limita o caminho à pasta local e exige uma prévia carregada.
function validarImagemGaleria() {
  const caminho = getLocalGalleryPath(campoCaminhoGaleria.value);
  const descricao = campoDescricaoGaleria.value.trim();
  campoCaminhoGaleria.setCustomValidity(
    caminho ? "" : "Informe um caminho direto para uma imagem existente dentro de imagens/."
  );
  campoDescricaoGaleria.setCustomValidity(
    descricao.length < 2 || descricao.length > 300
      ? "Informe uma descrição entre 2 e 300 caracteres."
      : ""
  );

  if (!formularioGaleria.checkValidity()) {
    formularioGaleria.reportValidity();
    return null;
  }

  if (caminhoPreviaCarregada !== caminho) {
    atualizarMensagemFormularioGaleria(
      erroPreviaGaleria
        ? "A imagem não pôde ser carregada. Confira o caminho e tente novamente."
        : "Aguarde a prévia carregar antes de salvar."
    );
    return null;
  }

  return { caminho, descricao };
}

// Cria ou atualiza um registro depois de confirmar a conta e a prévia do arquivo.
async function salvarImagemGaleria(evento) {
  evento.preventDefault();

  if (!proprietariaAutorizada()) {
    atualizarMensagemFormularioGaleria(
      "Somente a conta autorizada pode salvar imagens na galeria."
    );
    return;
  }

  if (!galeriaCarregada) {
    atualizarMensagemFormularioGaleria(
      "Carregue a galeria antes de salvar. Tente novamente."
    );
    return;
  }

  if (operacaoGaleriaEmAndamento) {
    return;
  }

  const dadosImagem = validarImagemGaleria();

  if (!dadosImagem) {
    return;
  }

  const idEmEdicao = imagemGaleriaEmEdicao;
  const estavaEditando = Boolean(idEmEdicao);
  definirFormularioGaleriaOcupado(true);
  botaoSalvarGaleria.textContent = "Salvando...";
  atualizarMensagemFormularioGaleria("Salvando imagem...");

  try {
    // Grava somente caminho local e descrição no documento da coleção galeria.
    if (idEmEdicao) {
      await updateDoc(doc(db, "galeria", idEmEdicao), dadosImagem);
    } else {
      await addDoc(collection(db, "galeria"), dadosImagem);
    }

    galeriaCarregada = false;
    limparFormularioGaleria();
    if (!estavaEditando) {
      paginacoesAdministrativas.galeria.pagina = 1;
    }
    const listaAtualizada = await carregarGaleria(true);
    atualizarMensagemFormularioGaleria(
      listaAtualizada
        ? estavaEditando
          ? "Imagem atualizada com sucesso."
          : "Imagem cadastrada com sucesso."
        : "Imagem salva, mas não foi possível atualizar a lista. Tente novamente."
    );
  } catch (erro) {
    // Expõe falhas de conexão ou permissão sem apresentar a gravação como bem-sucedida.
    console.error("Não foi possível salvar a imagem na galeria:", erro);
    atualizarMensagemFormularioGaleria(
      "Não foi possível salvar a imagem. Verifique a conexão e as permissões do Firestore."
    );
  } finally {
    definirFormularioGaleriaOcupado(false);
    atualizarModoFormularioGaleria();
  }
}

// Confirma e executa a exclusão, depois atualiza a lista a partir do Firestore.
async function excluirImagemGaleria(id, descricao) {
  if (!proprietariaAutorizada()) {
    atualizarMensagemFormularioGaleria(
      "Somente a conta autorizada pode excluir imagens da galeria."
    );
    return;
  }

  if (
    operacaoGaleriaEmAndamento ||
    !window.confirm(`Deseja excluir a imagem "${descricao}"? Esta ação não pode ser desfeita.`)
  ) {
    return;
  }

  definirFormularioGaleriaOcupado(true);
  atualizarMensagemFormularioGaleria("Excluindo imagem...");

  try {
    // Remove somente o documento confirmado da coleção galeria.
    await deleteDoc(doc(db, "galeria", id));

    if (imagemGaleriaEmEdicao === id) {
      limparFormularioGaleria();
    }

    galeriaCarregada = false;
    const listaAtualizada = await carregarGaleria(true);
    atualizarMensagemFormularioGaleria(
      listaAtualizada
        ? "Imagem excluída com sucesso."
        : "Imagem excluída, mas não foi possível atualizar a lista. Tente novamente."
    );
  } catch (erro) {
    // Comunica falhas sem remover o cartão antes da confirmação do Firestore.
    console.error("Não foi possível excluir a imagem da galeria:", erro);
    atualizarMensagemFormularioGaleria(
      "Não foi possível excluir a imagem. Verifique a conexão e as permissões do Firestore."
    );
  } finally {
    definirFormularioGaleriaOcupado(false);
    atualizarModoFormularioGaleria();
  }
}

// Converte somente os dois valores permitidos em rótulos visíveis no painel.
function rotuloCategoriaServico(categoria) {
  if (categoria === "cera") {
    return "Epilação";
  }

  if (categoria === "sobrancelhas") {
    return "Sobrancelhas";
  }

  return "Categoria pendente";
}

// Cria um cartão usando textContent para exibir os dados e as ações com segurança.
function criarCartaoServico(documento) {
  const servico = documento.data();
  const cartao = document.createElement("article");
  cartao.className = "service-admin-card";

  // Exibe cada campo com uma indicação explícita caso o documento esteja incompleto.
  const titulo = document.createElement("h2");
  titulo.textContent =
    typeof servico.procedimento === "string" && servico.procedimento.trim()
      ? servico.procedimento.trim()
      : "Serviço sem nome";

  // Sinaliza registros antigos sem categoria sem tentar deduzi-la pelo nome.
  const categoria = document.createElement("p");
  categoria.className = "service-admin-category";
  categoria.textContent =
    servico.categoria === "cera" || servico.categoria === "sobrancelhas"
      ? `Categoria: ${rotuloCategoriaServico(servico.categoria)}`
      : "Categoria pendente: edite este serviço e escolha uma categoria.";

  const linhaPreco = document.createElement("p");
  linhaPreco.className = "service-admin-price";

  const rotuloPreco = document.createElement("span");
  rotuloPreco.textContent = "Preço";

  const valorPreco = document.createElement("strong");
  valorPreco.textContent = formatarPreco(servico.preco);

  linhaPreco.append(rotuloPreco, valorPreco);
  cartao.append(titulo, categoria, linhaPreco);

  // Oferece ações somente dentro da sessão autorizada; as regras também as protegem.
  if (proprietariaAutorizada()) {
    const acoes = document.createElement("div");
    acoes.className = "service-admin-actions";

    const botaoEditar = document.createElement("button");
    botaoEditar.type = "button";
    botaoEditar.className = "service-action-button";
    botaoEditar.textContent = "Editar";
    botaoEditar.addEventListener("click", () => {
      iniciarEdicaoServico(documento.id, servico);
    });

    const botaoExcluir = document.createElement("button");
    botaoExcluir.type = "button";
    botaoExcluir.className = "service-action-button service-delete-button";
    botaoExcluir.textContent = "Excluir";
    botaoExcluir.addEventListener("click", () => {
      void excluirServico(documento.id, titulo.textContent);
    });

    acoes.append(botaoEditar, botaoExcluir);
    cartao.append(acoes);
  }

  return cartao;
}

// Preenche o formulário com os dados existentes para iniciar a edição.
function iniciarEdicaoServico(id, servico) {
  if (!proprietariaAutorizada() || operacaoServicoEmAndamento) {
    return;
  }

  servicoEmEdicao = id;
  campoNomeServico.value =
    typeof servico.procedimento === "string" ? servico.procedimento : "";
  campoCategoriaServico.value =
    servico.categoria === "cera" || servico.categoria === "sobrancelhas"
      ? servico.categoria
      : "";
  campoPrecoServico.value =
    typeof servico.preco === "number" || typeof servico.preco === "string"
      ? String(servico.preco)
      : "";
  atualizarModoFormulario();
  atualizarMensagemFormulario("");
  campoNomeServico.focus();
}

// Valida somente nome, categoria e preço; as orientações são editadas por categoria.
function validarServico() {
  const procedimento = campoNomeServico.value.trim();
  const categoria = campoCategoriaServico.value;
  const preco = converterPreco(campoPrecoServico.value);

  campoNomeServico.setCustomValidity(
    procedimento.length < 2 ? "Informe um nome com pelo menos 2 caracteres." : ""
  );
  campoCategoriaServico.setCustomValidity(
    categoria !== "cera" && categoria !== "sobrancelhas"
      ? "Selecione Epilação ou Sobrancelhas."
      : ""
  );
  campoPrecoServico.setCustomValidity(
    preco === null
      ? "Informe um preço válido, entre R$ 0,00 e R$ 1.000.000,00, com até duas casas decimais."
      : ""
  );

  if (!formularioServico.checkValidity()) {
    formularioServico.reportValidity();
    return null;
  }

  return { procedimento, categoria, preco };
}

// Lê os serviços e devolve o resultado para que operações confirmem a atualização.
async function carregarServicos(forcarAtualizacao = false) {
  // Impede consultas administrativas anônimas ou por uma conta diferente.
  if (!proprietariaAutorizada()) {
    atualizarEstadoServicos("Entre com a conta autorizada para consultar os serviços.");
    return false;
  }

  // Reutiliza uma lista recente e evita chamadas simultâneas à coleção.
  if (servicosCarregados && !forcarAtualizacao) {
    renderizarPaginacao("servicos", criarCartaoServico);
    return true;
  }

  if (requisicaoServicos) {
    const resultadoEmAndamento = await requisicaoServicos;

    if (!forcarAtualizacao) {
      return resultadoEmAndamento;
    }
  }

  // Informa que a consulta está em andamento.
  atualizarEstadoServicos("Carregando serviços...");

  // Busca os documentos da coleção e os transforma em cartões administrativos.
  requisicaoServicos = (async () => {
    try {
      const resultado = await getDocs(collection(db, "servicos"));
      const servicosSemCategoria = resultado.docs.filter((documento) => {
        const servico = documento.data();
        return servico.categoria !== "cera" && servico.categoria !== "sobrancelhas";
      }).length;
      paginacoesAdministrativas.servicos.documentos = resultado.docs;
      renderizarPaginacao("servicos", criarCartaoServico);
      servicosCarregados = true;

      // Mantém registros antigos sem categoria pendentes de escolha manual pela Valéria.
      if (resultado.empty) {
        atualizarEstadoServicos("Nenhum serviço cadastrado.");
      } else if (servicosSemCategoria > 0) {
        atualizarEstadoServicos(
          `${servicosSemCategoria} serviço(s) sem categoria precisam ser revisados. Edite cada cadastro e escolha Epilação ou Sobrancelhas; eles não serão classificados automaticamente.`
        );
      } else {
        atualizarEstadoServicos("");
      }

      return true;
    } catch (erro) {
      // Registra e comunica erros de leitura sem apresentar uma lista vazia como sucesso.
      console.error("Não foi possível carregar os serviços do Firestore:", erro);
      atualizarEstadoServicos("Não foi possível carregar os serviços. Tente novamente.");
      return false;
    } finally {
      // Permite tentar novamente se a consulta falhar.
      requisicaoServicos = null;
    }
  })();

  return await requisicaoServicos;
}

// Converte uma avaliação válida em cinco símbolos de estrela para apresentação.
function estrelasAvaliacao(avaliacao) {
  if (!Number.isInteger(avaliacao) || avaliacao < 1 || avaliacao > 5) {
    return null;
  }

  return "★".repeat(avaliacao) + "☆".repeat(5 - avaliacao);
}

// Exibe mensagens de carregamento, lista vazia ou falha da consulta de comentários.
function atualizarEstadoComentarios(mensagem) {
  estadoComentarios.textContent = mensagem;
  estadoComentarios.hidden = mensagem.length === 0;
}

// Comunica o resultado das operações de cadastro, edição e exclusão.
function atualizarMensagemFormularioComentario(mensagem) {
  mensagemFormularioComentario.textContent = mensagem;
}

// Atualiza os rótulos do formulário conforme o modo de cadastro ou edição.
function atualizarModoFormularioComentario() {
  const estaEditando = Boolean(comentarioEmEdicao);
  tituloFormularioComentario.textContent = estaEditando
    ? "Editar comentário"
    : "Adicionar comentário";
  botaoSalvarComentario.textContent = estaEditando
    ? "Salvar alterações"
    : "Adicionar comentário";
  botaoCancelarEdicaoComentario.hidden = !estaEditando;
}

// Limpa os campos e retorna o formulário de comentários ao modo de cadastro.
function limparFormularioComentario() {
  formularioComentario.reset();
  comentarioEmEdicao = null;
  atualizarModoFormularioComentario();
  atualizarMensagemFormularioComentario("");
}

// Mostra o estado de leitura ou ausência do documento de informações.
function atualizarEstadoInformacoes(mensagem) {
  estadoInformacoes.textContent = mensagem;
  estadoInformacoes.hidden = mensagem.length === 0;
}

// Exibe mensagens de sucesso e erro relacionadas ao formulário de informações.
function atualizarMensagemFormularioInformacoes(mensagem) {
  mensagemFormularioInformacoes.textContent = mensagem;
}

// Identifica se o formulário está criando o documento ou editando dados existentes.
function atualizarModoFormularioInformacoes() {
  tituloFormularioInformacoes.textContent = documentoInformacoesExiste
    ? "Editar informações do estabelecimento"
    : "Cadastrar informações do estabelecimento";
  botaoSalvarInformacoes.textContent = documentoInformacoesExiste
    ? "Salvar alterações"
    : "Cadastrar informações";
}

// Alterna os campos enquanto o painel consulta ou grava o documento.
function definirFormularioInformacoesOcupado(ocupado) {
  operacaoInformacoesEmAndamento = ocupado;
  campoNomeEstabelecimento.disabled = ocupado;
  campoWhatsappEstabelecimento.disabled = ocupado;
  campoInstagramEstabelecimento.disabled = ocupado;
  campoEnderecoEstabelecimento.disabled = ocupado;
  botaoSalvarInformacoes.disabled = ocupado || !informacoesCarregadas;
}

// Limpa valores e estados sensíveis ao encerrar ou trocar a sessão administrativa.
function limparFormularioInformacoes() {
  formularioInformacoes.reset();
  informacoesCarregadas = false;
  documentoInformacoesExiste = false;
  atualizarModoFormularioInformacoes();
  atualizarEstadoInformacoes("");
  atualizarMensagemFormularioInformacoes("");
  botaoTentarCarregarInformacoes.hidden = true;
  definirFormularioInformacoesOcupado(false);
}

// Valida os quatro campos no mesmo formato esperado pela leitura pública e pelas regras.
function validarInformacoes() {
  const nome = campoNomeEstabelecimento.value.trim();
  const whatsapp = campoWhatsappEstabelecimento.value.trim();
  const digitosWhatsapp = whatsapp.replace(/\D/g, "");
  const instagramInformado = campoInstagramEstabelecimento.value.trim();
  const endereco = campoEnderecoEstabelecimento.value.trim();
  let urlInstagram = null;

  try {
    urlInstagram = new URL(instagramInformado);
  } catch (erro) {
    urlInstagram = null;
  }

  campoNomeEstabelecimento.setCustomValidity(
    nome.length < 2 ? "Informe um nome com pelo menos 2 caracteres." : ""
  );
  campoWhatsappEstabelecimento.setCustomValidity(
    !/^[0-9+() -]{10,25}$/.test(whatsapp) ||
      digitosWhatsapp.length < 10 ||
      digitosWhatsapp.length > 15
      ? "Informe um telefone com código do país e de 10 a 15 dígitos."
      : ""
  );
  campoInstagramEstabelecimento.setCustomValidity(
    !urlInstagram ||
      urlInstagram.protocol !== "https:" ||
      !["instagram.com", "www.instagram.com"].includes(urlInstagram.hostname) ||
      Boolean(urlInstagram.username || urlInstagram.password)
      ? "Informe uma URL HTTPS válida do Instagram."
      : ""
  );
  campoEnderecoEstabelecimento.setCustomValidity(
    endereco.length < 5 ? "Informe um endereço com pelo menos 5 caracteres." : ""
  );

  if (!formularioInformacoes.checkValidity()) {
    formularioInformacoes.reportValidity();
    return null;
  }

  return {
    nome,
    whatsapp,
    instagram: urlInstagram.href,
    endereco
  };
}

// Lê o documento único e deixa o formulário pronto para edição ou cadastro inicial.
async function carregarInformacoes() {
  if (!proprietariaAutorizada()) {
    informacoesCarregadas = false;
    atualizarEstadoInformacoes("Entre com a conta autorizada para consultar as informações.");
    botaoSalvarInformacoes.disabled = true;
    return false;
  }

  if (requisicaoInformacoes) {
    return await requisicaoInformacoes;
  }

  informacoesCarregadas = false;
  botaoTentarCarregarInformacoes.hidden = true;
  atualizarMensagemFormularioInformacoes("");
  atualizarEstadoInformacoes("Carregando informações...");
  definirFormularioInformacoesOcupado(true);

  requisicaoInformacoes = (async () => {
    try {
      // Consulta o mesmo documento único usado pela seção pública do site.
      const resultado = await getDoc(doc(db, "informacoes", "estabelecimento"));

      if (!proprietariaAutorizada()) {
        return false;
      }

      if (resultado.exists()) {
        const informacoes = resultado.data();
        campoNomeEstabelecimento.value =
          typeof informacoes.nome === "string" ? informacoes.nome : "";
        campoWhatsappEstabelecimento.value =
          typeof informacoes.whatsapp === "string" ? informacoes.whatsapp : "";
        campoInstagramEstabelecimento.value =
          typeof informacoes.instagram === "string" ? informacoes.instagram : "";
        campoEnderecoEstabelecimento.value =
          typeof informacoes.endereco === "string" ? informacoes.endereco : "";
        documentoInformacoesExiste = true;
        atualizarEstadoInformacoes("");
      } else {
        // Um formulário vazio permite criar o documento sem duplicar registros.
        formularioInformacoes.reset();
        documentoInformacoesExiste = false;
        atualizarEstadoInformacoes(
          "O documento ainda não existe. Preencha os campos para cadastrá-lo."
        );
      }

      informacoesCarregadas = true;
      atualizarModoFormularioInformacoes();
      return true;
    } catch (erro) {
      // Mostra a falha de leitura e oferece uma nova tentativa sem permitir uma gravação cega.
      console.error("Não foi possível carregar as informações do Firestore:", erro);
      atualizarEstadoInformacoes(
        "Não foi possível carregar as informações. Verifique a conexão e as regras do Firestore."
      );
      botaoTentarCarregarInformacoes.hidden = false;
      return false;
    } finally {
      // Reativa os campos e libera uma nova consulta após qualquer resultado.
      definirFormularioInformacoesOcupado(false);
      requisicaoInformacoes = null;
    }
  })();

  return await requisicaoInformacoes;
}

// Alterna os campos de comentário enquanto uma operação está em andamento.
function definirFormularioComentarioOcupado(ocupado) {
  operacaoComentarioEmAndamento = ocupado;
  campoNomeComentario.disabled = ocupado;
  campoTextoComentario.disabled = ocupado;
  campoAvaliacaoComentario.disabled = ocupado;
  botaoSalvarComentario.disabled = ocupado;
  botaoCancelarEdicaoComentario.disabled = ocupado;
}

// Monta um cartão de depoimento e inclui ações apenas para a conta autorizada.
function criarCartaoComentario(documento) {
  const comentario = documento.data();
  const cartao = document.createElement("article");
  cartao.className = "service-admin-card comment-admin-card";

  // Apresenta o nome da cliente sem interpretar o texto como marcação HTML.
  const nome = document.createElement("h2");
  nome.textContent =
    typeof comentario.nome === "string" && comentario.nome.trim()
      ? comentario.nome.trim()
      : "Nome não informado";

  // Exibe a nota em estrelas ou informa quando o registro está incompleto.
  const nota = document.createElement("span");
  nota.className = "comment-admin-rating";
  const estrelas = estrelasAvaliacao(comentario.avaliacao);
  nota.textContent = estrelas || "Avaliação não informada";

  if (estrelas) {
    nota.setAttribute("aria-label", `${comentario.avaliacao} de 5 estrelas`);
  }

  // Apresenta o texto do depoimento de forma segura.
  const texto = document.createElement("p");
  texto.className = "comment-admin-text";
  texto.textContent =
    typeof comentario.texto === "string" && comentario.texto.trim()
      ? comentario.texto.trim()
      : "Comentário não informado.";

  cartao.append(nome, nota, texto);

  // Mantém ações de escrita invisíveis para clientes e sessões não autorizadas.
  if (proprietariaAutorizada()) {
    const acoes = document.createElement("div");
    acoes.className = "service-admin-actions";

    const botaoEditar = document.createElement("button");
    botaoEditar.type = "button";
    botaoEditar.className = "service-action-button";
    botaoEditar.textContent = "Editar";
    botaoEditar.addEventListener("click", () => {
      iniciarEdicaoComentario(documento.id, comentario);
    });

    const botaoExcluir = document.createElement("button");
    botaoExcluir.type = "button";
    botaoExcluir.className = "service-action-button service-delete-button";
    botaoExcluir.textContent = "Excluir";
    botaoExcluir.addEventListener("click", () => {
      void excluirComentario(documento.id, nome.textContent);
    });

    acoes.append(botaoEditar, botaoExcluir);
    cartao.append(acoes);
  }

  return cartao;
}

// Carrega os dados do comentário selecionado nos campos para edição.
function iniciarEdicaoComentario(id, comentario) {
  if (!proprietariaAutorizada() || operacaoComentarioEmAndamento) {
    return;
  }

  comentarioEmEdicao = id;
  campoNomeComentario.value =
    typeof comentario.nome === "string" ? comentario.nome : "";
  campoTextoComentario.value =
    typeof comentario.texto === "string" ? comentario.texto : "";
  campoAvaliacaoComentario.value =
    Number.isInteger(comentario.avaliacao) &&
    comentario.avaliacao >= 1 &&
    comentario.avaliacao <= 5
      ? String(comentario.avaliacao)
      : "";
  atualizarModoFormularioComentario();
  atualizarMensagemFormularioComentario("");
  campoNomeComentario.focus();
}

// Valida nome, texto e avaliação antes de criar ou atualizar um depoimento.
function validarComentario() {
  const nome = campoNomeComentario.value.trim();
  const texto = campoTextoComentario.value.trim();
  const avaliacao = Number(campoAvaliacaoComentario.value);

  campoNomeComentario.setCustomValidity(
    nome.length < 2 ? "Informe um nome com pelo menos 2 caracteres." : ""
  );
  campoTextoComentario.setCustomValidity(
    texto.length < 2 ? "Informe um comentário com pelo menos 2 caracteres." : ""
  );
  campoAvaliacaoComentario.setCustomValidity(
    !Number.isInteger(avaliacao) || avaliacao < 1 || avaliacao > 5
      ? "Selecione uma avaliação entre 1 e 5 estrelas."
      : ""
  );

  if (!formularioComentario.checkValidity()) {
    formularioComentario.reportValidity();
    return null;
  }

  return { nome, texto, avaliacao };
}

// Consulta os depoimentos existentes sem permitir gravações para visitantes.
async function carregarComentarios(forcarAtualizacao = false) {
  // Impede consultas administrativas anônimas ou por uma conta diferente.
  if (!proprietariaAutorizada()) {
    atualizarEstadoComentarios("Entre com a conta autorizada para consultar os comentários.");
    return false;
  }

  // Reutiliza a lista existente e evita chamadas simultâneas à coleção.
  if (comentariosCarregados && !forcarAtualizacao) {
    renderizarPaginacao("comentarios", criarCartaoComentario);
    return true;
  }

  if (requisicaoComentarios) {
    const resultadoEmAndamento = await requisicaoComentarios;

    if (!forcarAtualizacao) {
      return resultadoEmAndamento;
    }
  }

  // Informa que a consulta dos depoimentos está em andamento.
  atualizarEstadoComentarios("Carregando comentários...");

  // Busca os documentos e atualiza a lista administrativa.
  requisicaoComentarios = (async () => {
    try {
      const resultado = await getDocs(collection(db, "comentarios"));
      paginacoesAdministrativas.comentarios.documentos = resultado.docs;
      renderizarPaginacao("comentarios", criarCartaoComentario);
      comentariosCarregados = true;
      atualizarEstadoComentarios(
        resultado.empty ? "Nenhum comentário cadastrado." : ""
      );
      return true;
    } catch (erro) {
      // Comunica falhas sem apresentar uma coleção inacessível como vazia.
      console.error("Não foi possível carregar os comentários do Firestore:", erro);
      atualizarEstadoComentarios("Não foi possível carregar os comentários. Tente novamente.");
      return false;
    } finally {
      // Permite repetir a consulta se houver falha de leitura.
      requisicaoComentarios = null;
    }
  })();

  return await requisicaoComentarios;
}

// Seleciona o item do menu e mostra somente o conteúdo da seção correspondente.
function ativarSecao(secaoSelecionada) {
  const painelSelecionado = document.querySelector(
    `[data-panel="${secaoSelecionada}"]`
  );

  // Ignora chaves que não correspondam a uma seção existente no HTML.
  if (!painelSelecionado) {
    return;
  }

  // Atualiza o estado visual e acessível de cada botão de navegação.
  botoesNavegacao.forEach((botao) => {
    const estaAtivo = botao.dataset.section === secaoSelecionada;
    botao.classList.toggle("active", estaAtivo);

    if (estaAtivo) {
      botao.setAttribute("aria-current", "page");
    } else {
      botao.removeAttribute("aria-current");
    }
  });

  // Oculta as seções inativas sem modificar os dados da página pública.
  paineisConteudo.forEach((painel) => {
    painel.hidden = painel === painelSelecionado ? false : true;
  });

  // Preserva o formulário de informações no refresh sem alterar a abertura das outras seções.
  try {
    if (secaoSelecionada === "information") {
      window.sessionStorage.setItem(
        CHAVE_SECAO_ADMINISTRATIVA,
        secaoSelecionada
      );
    } else {
      window.sessionStorage.removeItem(CHAVE_SECAO_ADMINISTRATIVA);
    }
  } catch (erro) {
    // A navegação continua funcionando mesmo quando o navegador bloqueia sessionStorage.
    console.error("Não foi possível salvar a seção administrativa atual:", erro);
  }

  // Carrega os serviços somente quando a seção é aberta por uma sessão autorizada.
  if (secaoSelecionada === "services") {
    void carregarServicos();
  }

  // Carrega os registros da galeria somente ao abrir sua seção administrativa.
  if (secaoSelecionada === "gallery") {
    void carregarGaleria();
  }

  // Carrega os dois documentos compartilhados somente ao abrir sua seção protegida.
  if (secaoSelecionada === "guidance") {
    Object.keys(formulariosOrientacoes).forEach((categoria) => {
      void carregarOrientacoesCategoria(categoria);
    });
  }

  // Lê os depoimentos somente ao abrir a seção administrativa correspondente.
  if (secaoSelecionada === "comments") {
    void carregarComentarios();
  }

  // Consulta os dados do estabelecimento somente ao abrir sua seção administrativa.
  if (secaoSelecionada === "information") {
    void carregarInformacoes();
  }
}

// Conecta cada item do menu à sua seção central.
botoesNavegacao.forEach((botao) => {
  botao.addEventListener("click", () => {
    ativarSecao(botao.dataset.section);
  });
});

// Conecta o formulário à coleção galeria e atualiza a prévia conforme os campos mudam.
formularioGaleria.addEventListener("submit", (evento) => {
  void salvarImagemGaleria(evento);
});

campoCaminhoGaleria.addEventListener("input", () => {
  campoCaminhoGaleria.setCustomValidity("");
  atualizarMensagemFormularioGaleria("");
  atualizarPreviaGaleria();
});

campoDescricaoGaleria.addEventListener("input", () => {
  campoDescricaoGaleria.setCustomValidity("");
  imagemPreviaGaleria.alt =
    campoDescricaoGaleria.value.trim() || "Prévia da imagem da galeria";
  atualizarMensagemFormularioGaleria("");
});

// Cancela a edição sem alterar o documento armazenado no Firestore.
botaoCancelarEdicaoGaleria.addEventListener("click", () => {
  if (!operacaoGaleriaEmAndamento) {
    limparFormularioGaleria();
  }
});

// Permite repetir a leitura caso haja uma falha de conexão ou permissão.
botaoTentarCarregarGaleria.addEventListener("click", () => {
  void carregarGaleria(true);
});

// Valida os campos de texto e conecta cada categoria ao seu próprio documento.
Object.values(formulariosOrientacoes).forEach((configuracao) => {
  configuracao.formulario.addEventListener("submit", (evento) => {
    void salvarOrientacoesCategoria(evento);
  });

  [configuracao.campoAntes, configuracao.campoDepois].forEach((campo) => {
    campo.addEventListener("input", () => {
      campo.setCustomValidity("");
      if (!configuracao.operacaoEmAndamento) {
        atualizarMensagemOrientacoes(configuracao, "");
      }
    });
  });
});

// Limpa validações customizadas quando os dados do estabelecimento são corrigidos.
[
  campoNomeEstabelecimento,
  campoWhatsappEstabelecimento,
  campoInstagramEstabelecimento,
  campoEnderecoEstabelecimento
].forEach((campo) => {
  campo.addEventListener("input", () => {
    campo.setCustomValidity("");
  });
  campo.addEventListener("change", () => {
    campo.setCustomValidity("");
  });
});

// Cria ou atualiza o documento de informações após validar a conta e os campos.
formularioInformacoes.addEventListener("submit", async (evento) => {
  evento.preventDefault();

  // Bloqueia gravações de sessões não autorizadas ou antes da leitura inicial.
  if (!proprietariaAutorizada()) {
    atualizarMensagemFormularioInformacoes(
      "Somente a conta autorizada pode salvar as informações."
    );
    return;
  }

  if (!informacoesCarregadas) {
    atualizarMensagemFormularioInformacoes(
      "Carregue as informações antes de salvar. Tente novamente."
    );
    return;
  }

  if (operacaoInformacoesEmAndamento) {
    return;
  }

  const dadosInformacoes = validarInformacoes();

  if (!dadosInformacoes) {
    return;
  }

  const estavaCadastrado = documentoInformacoesExiste;
  definirFormularioInformacoesOcupado(true);
  botaoSalvarInformacoes.textContent = "Salvando...";
  atualizarMensagemFormularioInformacoes("Salvando informações...");

  try {
    // setDoc cria o documento ausente ou substitui seus dados atuais no mesmo caminho.
    await setDoc(doc(db, "informacoes", "estabelecimento"), dadosInformacoes);

    if (!proprietariaAutorizada()) {
      return;
    }

    documentoInformacoesExiste = true;
    informacoesCarregadas = true;
    atualizarModoFormularioInformacoes();
    atualizarEstadoInformacoes("");
    atualizarMensagemFormularioInformacoes(
      estavaCadastrado
        ? "Informações atualizadas com sucesso."
        : "Informações cadastradas com sucesso."
    );
  } catch (erro) {
    // Expõe erros de conexão ou permissão sem apresentar uma gravação como bem-sucedida.
    console.error("Não foi possível salvar as informações do Firestore:", erro);
    atualizarMensagemFormularioInformacoes(
      "Não foi possível salvar as informações. Verifique a conexão e as regras do Firestore."
    );
  } finally {
    // Reativa o formulário e restaura o rótulo correto da ação.
    definirFormularioInformacoesOcupado(false);
    atualizarModoFormularioInformacoes();
  }
});

// Permite tentar novamente a leitura quando o Firestore ou as regras causarem uma falha.
botaoTentarCarregarInformacoes.addEventListener("click", () => {
  void carregarInformacoes();
});

// Limpa erros de validação customizados quando a proprietária corrige cada campo.
[
  campoNomeServico,
  campoCategoriaServico,
  campoPrecoServico
].forEach((campo) => {
  campo.addEventListener("input", () => {
    campo.setCustomValidity("");
  });
  campo.addEventListener("change", () => {
    campo.setCustomValidity("");
  });
});

// Salva um serviço novo ou atualiza o documento selecionado após validar os campos.
formularioServico.addEventListener("submit", async (evento) => {
  evento.preventDefault();

  // Bloqueia gravações iniciadas fora da sessão da proprietária autorizada.
  if (!proprietariaAutorizada()) {
    atualizarMensagemFormulario("Somente a conta autorizada pode salvar serviços.");
    return;
  }

  if (operacaoServicoEmAndamento) {
    return;
  }

  const dadosServico = validarServico();

  if (!dadosServico) {
    return;
  }

  const idEmEdicao = servicoEmEdicao;
  const estavaEditando = Boolean(idEmEdicao);
  definirFormularioOcupado(true);
  botaoSalvarServico.textContent = "Salvando...";
  atualizarMensagemFormulario("Salvando serviço...");

  try {
    // Substitui o esquema antigo ao editar, removendo descricao sem alterar os valores mantidos.
    if (idEmEdicao) {
      await setDoc(doc(db, "servicos", idEmEdicao), dadosServico);
    } else {
      await addDoc(collection(db, "servicos"), dadosServico);
    }

    // Atualiza a lista a partir do Firestore após a confirmação da gravação.
    servicosCarregados = false;
    limparFormularioServico();
    if (!estavaEditando) {
      paginacoesAdministrativas.servicos.pagina = 1;
    }
    const listaAtualizada = await carregarServicos(true);
    atualizarMensagemFormulario(
      listaAtualizada
        ? estavaEditando
          ? "Serviço atualizado com sucesso."
          : "Serviço adicionado com sucesso."
        : "Serviço salvo, mas não foi possível atualizar a lista. Tente novamente."
    );
  } catch (erro) {
    // Comunica falhas de permissão ou conexão sem apresentar uma gravação como bem-sucedida.
    console.error("Não foi possível salvar o serviço:", erro);
    atualizarMensagemFormulario(
      "Não foi possível salvar o serviço. Verifique sua conexão e as permissões do Firestore."
    );
  } finally {
    // Reativa o formulário independentemente do resultado da operação.
    definirFormularioOcupado(false);
    atualizarModoFormulario();
  }
});

// Cancela a edição e limpa os campos sem alterar o documento no Firestore.
botaoCancelarEdicaoServico.addEventListener("click", () => {
  if (!operacaoServicoEmAndamento) {
    limparFormularioServico();
  }
});

// Confirma e executa a exclusão, depois consulta novamente a coleção.
async function excluirServico(id, nome) {
  if (!proprietariaAutorizada()) {
    atualizarMensagemFormulario("Somente a conta autorizada pode excluir serviços.");
    return;
  }

  if (
    operacaoServicoEmAndamento ||
    !window.confirm(`Deseja excluir o serviço "${nome}"? Esta ação não pode ser desfeita.`)
  ) {
    return;
  }

  definirFormularioOcupado(true);
  atualizarMensagemFormulario("Excluindo serviço...");

  try {
    // Remove somente o documento confirmado na coleção de serviços.
    await deleteDoc(doc(db, "servicos", id));

    // Limpa o formulário se ele estava editando o documento removido.
    if (servicoEmEdicao === id) {
      limparFormularioServico();
    }

    // Atualiza a lista depois da exclusão confirmada no Firestore.
    servicosCarregados = false;
    const listaAtualizada = await carregarServicos(true);
    // A renderização corrige automaticamente se a exclusão tiver removido a última página.
    renderizarPaginacao("servicos", criarCartaoServico);
    atualizarMensagemFormulario(
      listaAtualizada
        ? "Serviço excluído com sucesso."
        : "Serviço excluído, mas não foi possível atualizar a lista. Tente novamente."
    );
  } catch (erro) {
    // Comunica falhas de permissão ou conexão sem remover o cartão da lista.
    console.error("Não foi possível excluir o serviço:", erro);
    atualizarMensagemFormulario(
      "Não foi possível excluir o serviço. Verifique sua conexão e as permissões do Firestore."
    );
  } finally {
    // Reativa as ações após concluir ou falhar a exclusão.
    definirFormularioOcupado(false);
    atualizarModoFormulario();
  }
}

// Limpa mensagens de validação quando a Valéria corrige os campos do comentário.
[campoNomeComentario, campoTextoComentario, campoAvaliacaoComentario].forEach((campo) => {
  campo.addEventListener("input", () => {
    campo.setCustomValidity("");
  });
  campo.addEventListener("change", () => {
    campo.setCustomValidity("");
  });
});

// Salva um depoimento novo ou atualiza o registro selecionado após validar os campos.
formularioComentario.addEventListener("submit", async (evento) => {
  evento.preventDefault();

  // Bloqueia gravações iniciadas fora da sessão da proprietária autorizada.
  if (!proprietariaAutorizada()) {
    atualizarMensagemFormularioComentario(
      "Somente a conta autorizada pode salvar comentários."
    );
    return;
  }

  if (operacaoComentarioEmAndamento) {
    return;
  }

  const dadosComentario = validarComentario();

  if (!dadosComentario) {
    return;
  }

  const idEmEdicao = comentarioEmEdicao;
  const estavaEditando = Boolean(idEmEdicao);
  definirFormularioComentarioOcupado(true);
  botaoSalvarComentario.textContent = "Salvando...";
  atualizarMensagemFormularioComentario("Salvando comentário...");

  try {
    // Grava somente nome, texto e avaliação na coleção de comentários.
    if (idEmEdicao) {
      await updateDoc(doc(db, "comentarios", idEmEdicao), dadosComentario);
    } else {
      await addDoc(collection(db, "comentarios"), dadosComentario);
    }

    // Atualiza a lista após a gravação confirmada no Firestore.
    comentariosCarregados = false;
    limparFormularioComentario();
    if (!estavaEditando) {
      paginacoesAdministrativas.comentarios.pagina = 1;
    }
    const listaAtualizada = await carregarComentarios(true);
    atualizarMensagemFormularioComentario(
      listaAtualizada
        ? estavaEditando
          ? "Comentário atualizado com sucesso."
          : "Comentário adicionado com sucesso."
        : "Comentário salvo, mas não foi possível atualizar a lista. Tente novamente."
    );
  } catch (erro) {
    // Comunica falhas de conexão ou permissão sem indicar sucesso indevido.
    console.error("Não foi possível salvar o comentário:", erro);
    atualizarMensagemFormularioComentario(
      "Não foi possível salvar o comentário. Verifique sua conexão e as permissões do Firestore."
    );
  } finally {
    // Reativa o formulário independentemente do resultado da operação.
    definirFormularioComentarioOcupado(false);
    atualizarModoFormularioComentario();
  }
});

// Cancela a edição do depoimento sem alterar o documento no Firestore.
botaoCancelarEdicaoComentario.addEventListener("click", () => {
  if (!operacaoComentarioEmAndamento) {
    limparFormularioComentario();
  }
});

// Confirma e executa a exclusão, depois consulta novamente os depoimentos.
async function excluirComentario(id, nome) {
  if (!proprietariaAutorizada()) {
    atualizarMensagemFormularioComentario(
      "Somente a conta autorizada pode excluir comentários."
    );
    return;
  }

  if (
    operacaoComentarioEmAndamento ||
    !window.confirm(`Deseja excluir o comentário de "${nome}"? Esta ação não pode ser desfeita.`)
  ) {
    return;
  }

  definirFormularioComentarioOcupado(true);
  atualizarMensagemFormularioComentario("Excluindo comentário...");

  try {
    // Remove somente o documento confirmado da coleção de comentários.
    await deleteDoc(doc(db, "comentarios", id));

    // Limpa o formulário caso estivesse editando o comentário removido.
    if (comentarioEmEdicao === id) {
      limparFormularioComentario();
    }

    // Atualiza a lista depois da exclusão confirmada no Firestore.
    comentariosCarregados = false;
    const listaAtualizada = await carregarComentarios(true);
    // A exclusão também recalcula o total e impede uma página vazia.
    renderizarPaginacao("comentarios", criarCartaoComentario);
    atualizarMensagemFormularioComentario(
      listaAtualizada
        ? "Comentário excluído com sucesso."
        : "Comentário excluído, mas não foi possível atualizar a lista. Tente novamente."
    );
  } catch (erro) {
    // Comunica falhas sem remover o cartão da lista antes da confirmação do Firestore.
    console.error("Não foi possível excluir o comentário:", erro);
    atualizarMensagemFormularioComentario(
      "Não foi possível excluir o comentário. Verifique sua conexão e as permissões do Firestore."
    );
  } finally {
    // Reativa as ações após concluir ou falhar a exclusão.
    definirFormularioComentarioOcupado(false);
    atualizarModoFormularioComentario();
  }
}

// Verifica se existe uma sessão ativa no Firebase.
onAuthStateChanged(auth, async (usuario) => {

  // Se não houver usuário autenticado, mantém a tela de login.
  if (!usuario) {
    mostrarLogin();
    return;
  }

  // Confere se o usuário conectado é a única conta autorizada.
  if (usuario.uid === UID_VALERIA) {
    mostrarPainel();
  } else {
    // Encerra a sessão de qualquer conta não autorizada.
    mostrarLogin();
    mensagemLogin.textContent = "Acesso não autorizado.";

    try {
      await signOut(auth);
    } catch (erro) {
      // Registra e informa explicitamente uma falha ao encerrar uma sessão indevida.
      console.error("Erro ao encerrar sessão não autorizada:", erro);
      mensagemLogin.textContent =
        "Acesso não autorizado. Não foi possível encerrar a sessão automaticamente.";
    }
  }
});

// Escuta o envio do formulário de login.
formularioLogin.addEventListener("submit", async (evento) => {

  // Impede que o navegador recarregue a página ao enviar o formulário.
  evento.preventDefault();

  // Obtém os valores digitados nos campos.
  const email = campoEmail.value.trim();
  const senha = campoSenha.value;

  // Informa que o sistema está realizando a autenticação.
  mensagemLogin.textContent = "Verificando acesso...";

  // Desativa o botão para evitar vários envios ao mesmo tempo.
  botaoLogin.disabled = true;
  botaoLogin.textContent = "Entrando...";

  try {

    // Solicita ao Firebase a autenticação com e-mail e senha.
    const resultado = await signInWithEmailAndPassword(
      auth,
      email,
      senha
    );

    // Recupera os dados do usuário autenticado.
    const usuario = resultado.user;

    // Confere se a conta pertence à proprietária autorizada.
    if (usuario.uid !== UID_VALERIA) {
      // Encerra a sessão caso a conta não seja autorizada.
      mensagemLogin.textContent = "Esta conta não tem permissão para acessar.";

      try {
        await signOut(auth);
      } catch (erro) {
        // Registra a falha para que uma sessão não autorizada não passe despercebida.
        console.error("Erro ao encerrar sessão não autorizada:", erro);
        mensagemLogin.textContent =
          "Esta conta não tem permissão. Não foi possível encerrar a sessão automaticamente.";
      }

      return;
    }

    // Exibe o painel somente após confirmar o UID autorizado.
    mensagemLogin.textContent = "Acesso autorizado!";
    mostrarPainel();

  } catch (erro) {
    // Registra o erro no console para facilitar a identificação de problemas.
    console.error("Erro ao realizar login:", erro);

    // Exibe uma mensagem simples caso os dados estejam incorretos.
    mensagemLogin.textContent = "E-mail ou senha incorretos. Tente novamente.";

  } finally {
    // Reativa o botão após o término da tentativa de login.
    botaoLogin.disabled = false;
    botaoLogin.textContent = "Entrar";
  }

});

// Encerra a sessão quando a proprietária solicita sair do painel.
botaoSair.addEventListener("click", async () => {
  mensagemPainel.textContent = "";

  try {
    await signOut(auth);
  } catch (erro) {
    // Mantém o painel visível e comunica a falha caso o Firebase não encerre a sessão.
    console.error("Erro ao sair da área administrativa:", erro);
    mensagemPainel.textContent = "Não foi possível sair da conta. Tente novamente.";
  }
});
