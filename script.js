// Importa as conexões com o Firebase.
import { db, auth } from "./firebase.js";

// Reutiliza a mesma validação de caminhos locais usada pelo painel administrativo.
import { getLocalGalleryPath } from "./gallery-utils.js";

// Importa as funções necessárias para escutar dados públicos em tempo real.
import {
  collection,
  doc,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

// Verifica se as conexões foram inicializadas.
console.log("Firebase conectado!");
console.log("Banco de dados:", db);
console.log("Autenticação:", auth);

// Mantém dados atuais como conteúdo inicial enquanto o Firestore carrega o registro oficial.
const CONTATOS = {
  nome: "Valéria Santos Beauty",
  whatsapp: "5531972321537",
  instagram: "https://www.instagram.com/valeriasantos.beauty/",
  endereco: "Avenida Doutor Rossini de Minas, 222, São Joaquim de Bicas - MG"
};
const WHATSAPP_MESSAGE =
  "Olá, Valéria! Conheci seu site e gostaria de agendar um horário. Poderia me passar mais informações?";

// Mantém a mensagem de contato sem guardar orientações individuais nos serviços.
const CONFIG_SERVICOS = {
  mensagemWhatsapp: "Olá, Valéria! Gostaria de consultar os serviços e valores."
};

const pagePanels = Array.from(document.querySelectorAll(".page-panel"));
const pageLinks = Array.from(document.querySelectorAll("[data-page-target]"));
const siteNav = document.querySelector("#site-nav");
const currentYear = document.querySelector("#current-year");
const whatsappLinks = Array.from(document.querySelectorAll("[data-whatsapp-link]"));
const instagramLinks = Array.from(document.querySelectorAll('[data-contact="instagram"]'));
const whatsappNumberLabels = Array.from(document.querySelectorAll("[data-whatsapp-number]"));
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const themeToggle = document.querySelector("#theme-toggle");
const THEME_STORAGE_KEY = "valeria-santos-beauty-theme";
const servicesDialog = document.querySelector("#services-dialog");
const servicesDialogClose = document.querySelector("#services-dialog-close");
// Localiza título, tabela e estados públicos dos preços e orientações compartilhadas.
const servicesDialogTitle = document.querySelector("#services-dialog-title");
const servicesPriceList = document.querySelector("#services-price-list");
const servicesPriceStatus = document.querySelector("#services-price-status");
const servicesGuidanceStatus = document.querySelector("#services-guidance-status");
const servicesBeforeList = document.querySelector("#services-before-list");
const servicesAfterList = document.querySelector("#services-after-list");
// Localiza as áreas públicas somente de leitura para os depoimentos.
const testimonialsList = document.querySelector("#testimonials-list");
const testimonialsStatus = document.querySelector("#testimonials-status");
// Localiza os textos e links públicos que recebem os dados do estabelecimento.
const businessNameLabels = Array.from(document.querySelectorAll("[data-business-name]"));
const businessAddressLabels = Array.from(document.querySelectorAll("[data-business-address]"));
const contactInfoStatus = document.querySelector("#contact-info-status");
const contactMapLink = document.querySelector("#contact-map-link");
// Localiza o contêiner público da galeria e seu estado de leitura.
const galleryItems = document.querySelector("#gallery-items");
const galleryStatus = document.querySelector("#gallery-status");
const serviceDialogTriggers = Array.from(
  document.querySelectorAll("[data-open-services-dialog]")
);

function readSavedTheme() {
  try {
    return window.localStorage.getItem(THEME_STORAGE_KEY) === "dark" ? "dark" : "light";
  } catch (error) {
    console.error("Não foi possível ler o tema salvo no armazenamento local.", error);
    return "light";
  }
}

function setTheme(theme, persist = false) {
  const activeTheme = theme === "dark" ? "dark" : "light";
  document.body.dataset.theme = activeTheme;

  if (themeToggle instanceof HTMLButtonElement) {
    themeToggle.setAttribute("aria-pressed", String(activeTheme === "dark"));
    themeToggle.setAttribute(
      "aria-label",
      activeTheme === "dark" ? "Ativar modo claro" : "Ativar modo escuro"
    );
  }

  const themeColor = document.querySelector('meta[name="theme-color"]');
  themeColor?.setAttribute("content", activeTheme === "dark" ? "#1c171c" : "#efa0b1");

  if (persist) {
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, activeTheme);
    } catch (error) {
      console.error("Não foi possível salvar o tema no armazenamento local.", error);
    }
  }
}

// Restaura a preferência salva e permite alternar o tema sem recarregar a página.
setTheme(readSavedTheme());

if (themeToggle instanceof HTMLButtonElement) {
  themeToggle.addEventListener("click", () => {
    setTheme(document.body.dataset.theme === "dark" ? "light" : "dark", true);
  });
}

// Formata preços numéricos em reais e preserva valores já gravados como texto.
function formatarPrecoServico(preco) {
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

// Guarda a assinatura ativa para interromper atualizações quando o diálogo fecha.
let unsubscribeServices = null;
// Mantém uma assinatura própria para o documento de orientações da categoria selecionada.
let unsubscribeGuidance = null;
// Evita callbacks pendentes de exibirem dados de uma categoria que já foi fechada ou trocada.
let activeServiceCategory = null;

// Assina preços e orientações públicas e exibe somente os dados da categoria selecionada.
function renderServicesDialog(categoriaSelecionada) {
  if (
    !(servicesDialogTitle instanceof HTMLElement) ||
    !(servicesPriceList instanceof HTMLTableSectionElement) ||
    !(servicesPriceStatus instanceof HTMLElement) ||
    !(servicesGuidanceStatus instanceof HTMLElement) ||
    !(servicesBeforeList instanceof HTMLUListElement) ||
    !(servicesAfterList instanceof HTMLUListElement)
  ) {
    console.error("Não foi possível encontrar as áreas de dados do quadro de serviços.");
    return;
  }

  // Não consulta nem apresenta serviços sem uma das categorias oficialmente permitidas.
  if (categoriaSelecionada !== "cera" && categoriaSelecionada !== "sobrancelhas") {
    console.error("A categoria solicitada para a tabela pública de serviços é inválida.");
    servicesPriceStatus.textContent = "Não foi possível identificar a categoria de serviços.";
    servicesPriceStatus.hidden = false;
    servicesGuidanceStatus.textContent = "Não foi possível identificar a categoria das orientações.";
    servicesGuidanceStatus.hidden = false;
    return;
  }

  // Evita listeners duplicados e associa os dados ao diálogo atualmente aberto.
  if (unsubscribeServices) {
    unsubscribeServices();
    unsubscribeServices = null;
  }
  if (unsubscribeGuidance) {
    unsubscribeGuidance();
    unsubscribeGuidance = null;
  }
  activeServiceCategory = categoriaSelecionada;

  // Mostra um único texto compartilhado e informa quando a Valéria ainda não o cadastrou.
  const fillGuidanceList = (list, texto, mensagemVazia) => {
    const item = document.createElement("li");
    item.textContent =
      typeof texto === "string" && texto.trim()
        ? texto.trim()
        : mensagemVazia;
    list.replaceChildren(item);
  };

  servicesBeforeList.replaceChildren();
  servicesAfterList.replaceChildren();

  // Identifica a categoria ativa no título do quadro para não misturar os serviços.
  const nomeCategoria =
    categoriaSelecionada === "cera" ? "Epilação" : "Sobrancelhas";
  servicesDialogTitle.textContent = `Serviços de ${nomeCategoria}`;

  // Informa ao cliente que a tabela está aguardando os dados públicos do Firestore.
  servicesPriceStatus.textContent = `Carregando serviços de ${nomeCategoria.toLowerCase()}...`;
  servicesPriceStatus.hidden = false;
  servicesPriceList.replaceChildren();
  servicesGuidanceStatus.textContent =
    `Carregando orientações de ${nomeCategoria.toLowerCase()}...`;
  servicesGuidanceStatus.hidden = false;

  try {
    // O snapshot inicial carrega os dados e os seguintes refletem alterações em tempo real.
    unsubscribeServices = onSnapshot(
      collection(db, "servicos"),
      (resultado) => {
        if (activeServiceCategory !== categoriaSelecionada) {
          return;
        }

        // Exibe apenas a categoria gravada; registros antigos sem categoria ficam de fora.
        const servicosDaCategoria = resultado.docs.filter(
          (documento) => documento.data().categoria === categoriaSelecionada
        );
        const linhas = servicosDaCategoria.map((documento) => {
          const servico = documento.data();
          const linha = document.createElement("tr");
          const valores = [
            typeof servico.procedimento === "string" && servico.procedimento.trim()
              ? servico.procedimento.trim()
              : "Serviço sem nome",
            formatarPrecoServico(servico.preco)
          ];

          valores.forEach((valor) => {
            const celula = document.createElement("td");
            celula.textContent = valor;
            linha.append(celula);
          });

          return linha;
        });

        // Atualiza apenas a tabela; as orientações vêm do documento compartilhado da categoria.
        servicesPriceList.replaceChildren(...linhas);
        servicesPriceStatus.textContent = servicosDaCategoria.length === 0
          ? `Nenhum serviço cadastrado na categoria ${nomeCategoria.toLowerCase()}.`
          : "";
        servicesPriceStatus.hidden = servicosDaCategoria.length > 0;
      },
      (error) => {
        // Comunica erros de leitura sem apresentar uma lista vazia como sucesso.
        console.error("Não foi possível acompanhar os serviços públicos do Firestore.", error);
        if (activeServiceCategory !== categoriaSelecionada) {
          return;
        }
        servicesPriceList.replaceChildren();
        servicesPriceStatus.textContent =
          "Não foi possível carregar os serviços agora. Tente novamente mais tarde.";
        servicesPriceStatus.hidden = false;
        unsubscribeServices = null;
      });
  } catch (error) {
    // Comunica erros síncronos ao iniciar a assinatura.
    console.error("Não foi possível iniciar a leitura pública dos serviços.", error);
    servicesPriceList.replaceChildren();
    servicesPriceStatus.textContent =
      "Não foi possível carregar os serviços agora. Tente novamente mais tarde.";
    servicesPriceStatus.hidden = false;
    unsubscribeServices = null;
  }

  try {
    // Lê uma única vez por categoria e acompanha alterações sem consultar cada serviço.
    unsubscribeGuidance = onSnapshot(
      doc(db, "orientacoes", categoriaSelecionada),
      (snapshot) => {
        if (activeServiceCategory !== categoriaSelecionada) {
          return;
        }

        if (!snapshot.exists()) {
          servicesBeforeList.replaceChildren();
          servicesAfterList.replaceChildren();
          servicesGuidanceStatus.textContent =
            `As orientações de ${nomeCategoria.toLowerCase()} ainda não foram cadastradas.`;
          servicesGuidanceStatus.hidden = false;
          return;
        }

        const orientacoes = snapshot.data();
        if (
          typeof orientacoes.antes !== "string" ||
          typeof orientacoes.depois !== "string"
        ) {
          console.error(`O documento de orientações de ${categoriaSelecionada} está incompleto.`);
          fillGuidanceList(
            servicesBeforeList,
            "",
            "Orientações indisponíveis."
          );
          fillGuidanceList(
            servicesAfterList,
            "",
            "Orientações indisponíveis."
          );
          servicesGuidanceStatus.textContent =
            "As orientações desta categoria estão incompletas.";
          servicesGuidanceStatus.hidden = false;
          return;
        }

        fillGuidanceList(
          servicesBeforeList,
          orientacoes.antes,
          "Nenhum cuidado prévio informado."
        );
        fillGuidanceList(
          servicesAfterList,
          orientacoes.depois,
          "Nenhuma recomendação posterior informada."
        );
        servicesGuidanceStatus.textContent = "";
        servicesGuidanceStatus.hidden = true;
      },
      (error) => {
        // Comunica falhas de leitura das orientações sem afetar a tabela de preços.
        console.error(
          `Não foi possível acompanhar as orientações de ${categoriaSelecionada}.`,
          error
        );
        if (activeServiceCategory !== categoriaSelecionada) {
          return;
        }
        servicesBeforeList.replaceChildren();
        servicesAfterList.replaceChildren();
        servicesGuidanceStatus.textContent =
          "Não foi possível carregar as orientações agora. Tente novamente mais tarde.";
        servicesGuidanceStatus.hidden = false;
        unsubscribeGuidance = null;
      }
    );
  } catch (error) {
    // Comunica erros síncronos ao iniciar a leitura do documento de orientações.
    console.error(
      `Não foi possível iniciar a leitura das orientações de ${categoriaSelecionada}.`,
      error
    );
    servicesGuidanceStatus.textContent =
      "Não foi possível carregar as orientações agora. Tente novamente mais tarde.";
    servicesGuidanceStatus.hidden = false;
    unsubscribeGuidance = null;
  }
}

// Converte uma avaliação válida em cinco símbolos de estrela para os clientes.
function formatarEstrelasComentario(avaliacao) {
  if (!Number.isInteger(avaliacao) || avaliacao < 1 || avaliacao > 5) {
    return null;
  }

  return "★".repeat(avaliacao) + "☆".repeat(5 - avaliacao);
}

// Mantém a escuta dos comentários ativa somente enquanto a seção pública está aberta.
let unsubscribeComments = null;

// Exibe depoimentos em tempo real sem permitir o envio de comentários pelo público.
function renderPublicComments() {
  if (
    !(testimonialsList instanceof HTMLElement) ||
    !(testimonialsStatus instanceof HTMLElement)
  ) {
    console.error("Não foi possível encontrar a área pública de comentários.");
    return;
  }

  // Evita abrir assinaturas duplicadas ao permanecer na seção.
  if (unsubscribeComments) {
    return;
  }

  // Mostra o estado de carregamento antes do primeiro snapshot.
  testimonialsStatus.textContent = "Carregando comentários...";
  testimonialsStatus.hidden = false;
  testimonialsList.replaceChildren();

  try {
    // O snapshot inicial e os seguintes refletem alterações da proprietária.
    unsubscribeComments = onSnapshot(
      collection(db, "comentarios"),
      (resultado) => {
        const cartoes = resultado.docs.map((documento) => {
          const comentario = documento.data();
          const cartao = document.createElement("article");
          cartao.className = "service-card";

          // Exibe estrelas acessíveis quando a nota está dentro do intervalo permitido.
          const avaliacao = formatarEstrelasComentario(comentario.avaliacao);
          const estrelas = document.createElement("span");
          estrelas.className = "testimonial-rating";
          estrelas.textContent = avaliacao || "Avaliação não informada";

          if (avaliacao) {
            estrelas.setAttribute(
              "aria-label",
              `${comentario.avaliacao} de 5 estrelas`
            );
          }

          // Mantém o texto do cliente como texto simples, sem interpretar HTML.
          const citacao = document.createElement("blockquote");
          const texto = document.createElement("p");
          texto.textContent =
            typeof comentario.texto === "string" && comentario.texto.trim()
              ? comentario.texto.trim()
              : "Comentário não informado.";
          citacao.append(texto);

          // Apresenta a identificação autorizada enviada pela proprietária.
          const nome = document.createElement("p");
          nome.className = "testimonial-author";
          nome.textContent =
            typeof comentario.nome === "string" && comentario.nome.trim()
              ? comentario.nome.trim()
              : "Cliente";

          cartao.append(estrelas, citacao, nome);
          return cartao;
        });

        // Atualiza todos os cartões e mostra mensagem quando ainda não há depoimentos.
        testimonialsList.replaceChildren(...cartoes);
        testimonialsStatus.textContent = resultado.empty
          ? "Nenhum comentário publicado no momento."
          : "";
        testimonialsStatus.hidden = !resultado.empty;
      },
      (error) => {
        // Comunica falhas sem tratar uma leitura negada como uma coleção vazia.
        console.error("Não foi possível carregar os comentários públicos do Firestore.", error);
        testimonialsStatus.textContent =
          "Não foi possível carregar os comentários agora. Tente novamente mais tarde.";
        testimonialsStatus.hidden = false;
        testimonialsList.replaceChildren();
        unsubscribeComments = null;
      }
    );
  } catch (error) {
    // Comunica falhas síncronas sem tratar uma leitura negada como coleção vazia.
    console.error("Não foi possível carregar os comentários públicos do Firestore.", error);
    testimonialsStatus.textContent =
      "Não foi possível carregar os comentários agora. Tente novamente mais tarde.";
    testimonialsStatus.hidden = false;
    unsubscribeComments = null;
  }
}

// Valida o formato do documento público antes de atualizar nomes e destinos externos.
function normalizePublicInformation(data) {
  const nome = typeof data.nome === "string" ? data.nome.trim() : "";
  const whatsapp =
    typeof data.whatsapp === "string" ? data.whatsapp.replace(/\D/g, "") : "";
  const instagramValue =
    typeof data.instagram === "string" ? data.instagram.trim() : "";
  const endereco = typeof data.endereco === "string" ? data.endereco.trim() : "";
  let instagram;

  try {
    instagram = new URL(instagramValue);
  } catch (error) {
    return null;
  }

  if (
    nome.length < 2 ||
    nome.length > 100 ||
    whatsapp.length < 10 ||
    whatsapp.length > 15 ||
    instagram.protocol !== "https:" ||
    !["instagram.com", "www.instagram.com"].includes(instagram.hostname) ||
    !endereco ||
    endereco.length > 300
  ) {
    return null;
  }

  return {
    // Corrige apenas a apresentação do nome recebido pelo Firestore, sem alterar o campo interno.
    nome: nome.replace(/\bValeria\b/g, "Valéria"),
    whatsapp,
    instagram: instagram.href,
    endereco
  };
}

// Aplica um conjunto validado de informações a todos os contatos públicos do site.
function applyPublicInformation(information) {
  businessNameLabels.forEach((label) => {
    label.textContent = information.nome;
  });
  businessAddressLabels.forEach((label) => {
    label.textContent = information.endereco;
  });

  instagramLinks.forEach((link) => {
    link.href = information.instagram;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
  });

  whatsappLinks.forEach((link) => {
    const message =
      link.dataset.whatsappMessage === "services"
        ? CONFIG_SERVICOS.mensagemWhatsapp
        : WHATSAPP_MESSAGE;
    link.href =
      `https://wa.me/${information.whatsapp}?text=${encodeURIComponent(message)}`;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
  });

  const formattedNumber =
    information.whatsapp.length === 13 && information.whatsapp.startsWith("55")
      ? `+55 (${information.whatsapp.slice(2, 4)}) ${information.whatsapp.slice(4, 9)}-${information.whatsapp.slice(9)}`
      : `+${information.whatsapp}`;

  whatsappNumberLabels.forEach((label) => {
    label.textContent = formattedNumber;
  });

  if (contactMapLink instanceof HTMLAnchorElement) {
    const mapUrl = new URL("https://www.google.com/maps/search/");
    mapUrl.searchParams.set("api", "1");
    mapUrl.searchParams.set("query", information.endereco);
    contactMapLink.href = mapUrl.href;
    contactMapLink.target = "_blank";
    contactMapLink.rel = "noopener noreferrer";
  }

  // Mantém a marca e o título do navegador coerentes com o cadastro público.
  document.title = `${information.nome} | Sobrancelhas e Depilação`;
}

// Mantém a escuta do documento de informações somente enquanto a seção está aberta.
let unsubscribeInformation = null;

// Atualiza em tempo real os dados de contato, sem expor controles de edição ao público.
function renderPublicInformation() {
  if (!(contactInfoStatus instanceof HTMLElement)) {
    console.error("Não foi possível encontrar o estado público das informações.");
    return;
  }

  if (unsubscribeInformation) {
    return;
  }

  contactInfoStatus.textContent = "Atualizando informações...";
  contactInfoStatus.hidden = false;

  try {
    // O documento informacoes/estabelecimento guarda os dados públicos do negócio.
    unsubscribeInformation = onSnapshot(
      doc(db, "informacoes", "estabelecimento"),
      (snapshot) => {
        if (!snapshot.exists()) {
          contactInfoStatus.textContent =
            "Informações não cadastradas no Firestore; os dados atuais do site continuam disponíveis.";
          return;
        }

        const information = normalizePublicInformation(snapshot.data());

        if (!information) {
          console.error(
            "O documento informacoes/estabelecimento tem campos ausentes ou inválidos."
          );
          contactInfoStatus.textContent =
            "As informações cadastradas estão incompletas; os dados atuais do site continuam disponíveis.";
          return;
        }

        applyPublicInformation(information);
        contactInfoStatus.textContent = "";
        contactInfoStatus.hidden = true;
      },
      (error) => {
        // Expõe falhas de leitura e mantém os últimos contatos funcionais exibidos.
        console.error("Não foi possível acompanhar as informações públicas do Firestore.", error);
        contactInfoStatus.textContent =
          "Não foi possível atualizar as informações; os dados atuais do site continuam disponíveis.";
        contactInfoStatus.hidden = false;
        unsubscribeInformation = null;
      }
    );
  } catch (error) {
    // Comunica falhas síncronas sem ocultar o conteúdo já disponível na página.
    console.error("Não foi possível iniciar a leitura das informações públicas.", error);
    contactInfoStatus.textContent =
      "Não foi possível atualizar as informações; os dados atuais do site continuam disponíveis.";
    contactInfoStatus.hidden = false;
    unsubscribeInformation = null;
  }
}

// Cria uma miniatura somente quando o documento aponta para imagem local e tem descrição.
function createGalleryCard(documento) {
  const imagem = documento.data();
  const caminho = getLocalGalleryPath(imagem.caminho);
  const descricao =
    typeof imagem.descricao === "string" ? imagem.descricao.trim() : "";

  if (!caminho || !descricao) {
    return null;
  }

  const cartao = document.createElement("button");
  cartao.type = "button";
  cartao.className = "gallery-item";
  cartao.dataset.lightboxSrc = caminho;
  cartao.setAttribute("aria-label", `Ampliar foto: ${descricao}`);

  // Mantém miniaturas locais e descrições vindas do Firestore como texto simples.
  const miniatura = document.createElement("img");
  miniatura.src = caminho;
  miniatura.alt = descricao;
  miniatura.loading = "lazy";
  miniatura.decoding = "async";
  miniatura.addEventListener("error", () => {
    // Oculta arquivos locais ausentes e informa que os caminhos do registro precisam de revisão.
    if (!galleryItems.contains(cartao)) {
      return;
    }

    cartao.remove();
    galleryStatus.textContent =
      "Uma ou mais imagens locais não foram encontradas; os caminhos precisam ser revisados.";
    galleryStatus.hidden = false;
  });

  const legenda = document.createElement("span");
  legenda.className = "gallery-caption";
  legenda.textContent = descricao;

  const dicaAmpliar = document.createElement("span");
  dicaAmpliar.className = "gallery-zoom";
  dicaAmpliar.setAttribute("aria-hidden", "true");
  dicaAmpliar.textContent = "Ampliar foto";

  cartao.append(miniatura, legenda, dicaAmpliar);
  return cartao;
}

// Mantém a assinatura da galeria ativa somente enquanto a seção pública está aberta.
let unsubscribeGallery = null;

// Escuta alterações da coleção galeria e atualiza as miniaturas em tempo real.
function renderPublicGallery() {
  if (!(galleryItems instanceof HTMLElement) || !(galleryStatus instanceof HTMLElement)) {
    console.error("Não foi possível encontrar a área pública da galeria.");
    return;
  }

  // Reutiliza a assinatura existente ao permanecer na mesma seção.
  if (unsubscribeGallery) {
    return;
  }

  // Informa o carregamento inicial e remove imagens que já não constam no Firestore.
  galleryStatus.textContent = "Carregando galeria...";
  galleryStatus.hidden = false;
  galleryItems.replaceChildren();

  try {
    // O snapshot inicial carrega os registros e os seguintes refletem alterações em tempo real.
    unsubscribeGallery = onSnapshot(
      collection(db, "galeria"),
      (resultado) => {
        const cartoes = [];
        let registrosInvalidos = 0;

        resultado.docs.forEach((documento) => {
          const cartao = createGalleryCard(documento);

          if (cartao) {
            cartoes.push(cartao);
          } else {
            registrosInvalidos += 1;
          }
        });

        // Atualiza somente as miniaturas e apresenta estados vazio ou registros inválidos.
        galleryItems.replaceChildren(...cartoes);

        if (resultado.empty) {
          galleryStatus.textContent = "Nenhuma imagem cadastrada no momento.";
          galleryStatus.hidden = false;
        } else if (registrosInvalidos > 0) {
          galleryStatus.textContent = cartoes.length > 0
            ? `${registrosInvalidos} imagem(ns) ignorada(s): confira o caminho em imagens/ e a descrição.`
            : "Os registros da galeria precisam de um caminho local válido e uma descrição.";
          galleryStatus.hidden = false;
        } else {
          galleryStatus.textContent = "";
          galleryStatus.hidden = true;
        }
      },
      (error) => {
        // Comunica falhas sem tratar acesso negado como uma galeria vazia.
        console.error("Não foi possível acompanhar a galeria pública do Firestore.", error);
        galleryItems.replaceChildren();
        galleryStatus.textContent =
          "Não foi possível carregar a galeria agora. Tente novamente mais tarde.";
        galleryStatus.hidden = false;
        unsubscribeGallery = null;
      }
    );
  } catch (error) {
    // Comunica erros síncronos ao iniciar a assinatura da galeria.
    console.error("Não foi possível iniciar a leitura pública da galeria.", error);
    galleryStatus.textContent =
      "Não foi possível carregar a galeria agora. Tente novamente mais tarde.";
    galleryStatus.hidden = false;
    unsubscribeGallery = null;
  }
}

let lastServicesDialogTrigger = null;

if (
  servicesDialog instanceof HTMLDialogElement &&
  servicesDialogClose instanceof HTMLButtonElement
) {
  serviceDialogTriggers.forEach((trigger) => {
    trigger.addEventListener("click", () => {
      lastServicesDialogTrigger = trigger;
      // Consulta novamente a categoria do botão para exibir somente seus dados atuais.
      void renderServicesDialog(trigger.dataset.serviceCategory);
      servicesDialog.showModal();
      servicesDialogClose.focus();
    });
  });

  servicesDialogClose.addEventListener("click", () => servicesDialog.close());

  servicesDialog.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;

    event.preventDefault();
    servicesDialog.close();
  });

  servicesDialog.addEventListener("click", (event) => {
    if (event.target !== servicesDialog) return;

    const bounds = servicesDialog.getBoundingClientRect();
    const clickedInside =
      event.clientX >= bounds.left &&
      event.clientX <= bounds.right &&
      event.clientY >= bounds.top &&
      event.clientY <= bounds.bottom;

    if (!clickedInside) servicesDialog.close();
  });

  servicesDialog.addEventListener("close", () => {
    // Libera a assinatura ao fechar o diálogo para evitar leituras contínuas em segundo plano.
    if (unsubscribeServices) {
      unsubscribeServices();
      unsubscribeServices = null;
    }
    // Interrompe também a assinatura das orientações e invalida callbacks pendentes.
    if (unsubscribeGuidance) {
      unsubscribeGuidance();
      unsubscribeGuidance = null;
    }
    activeServiceCategory = null;

    if (lastServicesDialogTrigger?.isConnected) lastServicesDialogTrigger.focus();
    lastServicesDialogTrigger = null;
  });
} else {
  console.error("Não foi possível inicializar o quadro de serviços.");
}

function getPageFromHash() {
  const sectionId = decodeURIComponent(window.location.hash.slice(1));
  const target = document.getElementById(sectionId);
  // Abre a página inicial ao acessar o site sem fragmento ou com um destino desconhecido.
  return target?.closest(".page-panel")?.dataset.page || "inicio";
}

function showPage(pageId, updateHistory = false) {
  const activePanel = pagePanels.find((panel) => panel.dataset.page === pageId);
  if (!activePanel) return false;

  // Interrompe a leitura da galeria ao sair da seção pública.
  if (pageId !== "galeria" && unsubscribeGallery) {
    unsubscribeGallery();
    unsubscribeGallery = null;
  }

  // Interrompe as leituras em tempo real ao sair das respectivas seções públicas.
  if (pageId !== "depoimentos" && unsubscribeComments) {
    unsubscribeComments();
    unsubscribeComments = null;
  }

  if (pageId !== "contato" && unsubscribeInformation) {
    unsubscribeInformation();
    unsubscribeInformation = null;
  }

  pagePanels.forEach((panel) => {
    panel.hidden = panel !== activePanel;
  });

  pageLinks.forEach((link) => {
    if (link.dataset.pageTarget === pageId) {
      link.setAttribute("aria-current", "page");
    } else {
      link.removeAttribute("aria-current");
    }
  });

  document.body.dataset.activePage = pageId;

  // Mantém a galeria atualizada enquanto essa página estiver visível.
  if (pageId === "galeria") {
    renderPublicGallery();
  }

  // Atualiza os comentários ao abrir a seção pública, sem adicionar formulário de envio.
  if (pageId === "depoimentos") {
    renderPublicComments();
  }

  // Carrega e acompanha os dados do estabelecimento ao abrir a seção de informações.
  if (pageId === "contato") {
    renderPublicInformation();
  }

  if (updateHistory && window.location.hash !== `#${pageId}`) {
    window.history.pushState({ pageId }, "", `#${pageId}`);
  }

  // Anima a troca sem depender de rolagem; respeita a preferência por movimento reduzido.
  if (!reducedMotion.matches && typeof activePanel.animate === "function") {
    activePanel.animate(
      [
        { opacity: 0.72, transform: "translateY(6px)" },
        { opacity: 1, transform: "translateY(0)" }
      ],
      { duration: 220, easing: "ease-out" }
    );
  }

  return true;
}

// O cabeçalho troca os painéis sem recarregar ou rolar a página.
if (siteNav) {
  siteNav.addEventListener("click", (event) => {
    if (!(event.target instanceof Element)) return;

    const link = event.target.closest("[data-page-target]");
    if (!link) return;

    event.preventDefault();
    showPage(link.dataset.pageTarget, true);
  });
}

// Links internos existentes também abrem a página que contém seu destino.
document.addEventListener("click", (event) => {
  if (event.defaultPrevented || !(event.target instanceof Element)) return;

  const link = event.target.closest('a[href^="#"]');
  if (!link) return;

  const sectionId = decodeURIComponent(link.getAttribute("href").slice(1));
  const target = document.getElementById(sectionId);
  const panel = target?.closest(".page-panel");

  if (panel) {
    event.preventDefault();
    showPage(panel.dataset.page, true);
  }
});

// O histórico do navegador restaura a página anterior, sem rolagem vertical.
window.addEventListener("popstate", () => {
  showPage(getPageFromHash());
});

// Abre a página Sobre por padrão, ou respeita um link direto para outra página.
const initialPage = getPageFromHash();
showPage(initialPage);

if (!window.location.hash) {
  window.history.replaceState({ pageId: initialPage }, "", `#${initialPage}`);
}

// Se um formulário #contact-form for adicionado, valida os campos obrigatórios.
const contactForm = document.querySelector("#contact-form");

if (contactForm instanceof HTMLFormElement) {
  const formFields = contactForm.querySelectorAll("input, textarea, select");

  formFields.forEach((field) => {
    field.addEventListener("input", () => {
      if (field.checkValidity()) {
        field.removeAttribute("aria-invalid");
      }
    });
  });

  contactForm.addEventListener("submit", (event) => {
    formFields.forEach((field) => {
      field.setAttribute("aria-invalid", String(!field.checkValidity()));
    });

    if (!contactForm.checkValidity()) {
      event.preventDefault();
      contactForm.reportValidity();
      contactForm.querySelector(":invalid")?.focus();
    }
  });
}

// Abre as fotos da galeria em uma janela acessível, fechável por botão ou Escape.
const galleryDialog = document.querySelector("#gallery-lightbox");
const lightboxImage = galleryDialog?.querySelector(".lightbox-image");
const lightboxCaption = galleryDialog?.querySelector(".lightbox-caption");
const lightboxClose = galleryDialog?.querySelector(".lightbox-close");
let lastGalleryTrigger = null;

if (
  galleryDialog instanceof HTMLDialogElement &&
  lightboxImage instanceof HTMLImageElement &&
  lightboxCaption instanceof HTMLElement &&
  lightboxClose instanceof HTMLButtonElement &&
  galleryItems instanceof HTMLElement
) {
  // Usa delegação para que miniaturas adicionadas pelo Firestore também abram o lightbox.
  galleryItems.addEventListener("click", (event) => {
    if (!(event.target instanceof Element)) {
      return;
    }

    const item = event.target.closest(".gallery-item");

    if (!item || !galleryItems.contains(item)) {
      return;
    }

    const preview = item.querySelector("img");
    const imageSource = item.dataset.lightboxSrc;

    if (!preview || !imageSource) {
      return;
    }

    lightboxImage.src = imageSource;
    lightboxImage.alt = preview.alt;
    lightboxCaption.textContent =
      item.querySelector(".gallery-caption")?.textContent.trim() || preview.alt;
    lastGalleryTrigger = item;
    galleryDialog.showModal();
  });

  lightboxClose.addEventListener("click", () => galleryDialog.close());

  galleryDialog.addEventListener("click", (event) => {
    if (event.target === galleryDialog) galleryDialog.close();
  });

  galleryDialog.addEventListener("close", () => {
    lightboxImage.removeAttribute("src");
    lightboxImage.alt = "";
    // Restaura o foco apenas se a miniatura ainda existir após uma atualização em tempo real.
    if (lastGalleryTrigger?.isConnected) {
      lastGalleryTrigger.focus();
    }
    lastGalleryTrigger = null;
  });
}

// Mantém links atuais funcionando até a primeira leitura bem-sucedida do Firestore.
const initialPublicInformation = normalizePublicInformation(CONTATOS);

if (initialPublicInformation) {
  applyPublicInformation(initialPublicInformation);
} else {
  console.error("Os dados públicos iniciais de contato são inválidos.");
}

if (currentYear) {
  currentYear.textContent = String(new Date().getFullYear());
}
