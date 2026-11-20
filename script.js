// Edite somente estes valores para atualizar os contatos oficiais do site.
const CONTATOS = {
  whatsapp: "5531972321537",
  instagram: "https://www.instagram.com/valeriasantos.beauty/"
};
const WHATSAPP_MESSAGE =
  "Olá, Valeria! Conheci seu site e gostaria de agendar um horário. Poderia me passar mais informações?";

// Edite esta área para atualizar procedimentos, preços, orientações e a mensagem de consulta.
const CONFIG_SERVICOS = {
  tabela: [
    {
      procedimento: "Sobrancelhas",
      descricao: "[Preencha a descrição do procedimento.]",
      preco: "[Preencha o preço.]"
    },
    {
      procedimento: "Depilação com cera",
      descricao: "[Preencha a descrição do procedimento.]",
      preco: "[Preencha o preço.]"
    }
  ],
  antes: ["[Preencha as orientações de preparação para o procedimento.]"],
  depois: ["[Preencha os cuidados e recomendações após o procedimento.]"],
  mensagemWhatsapp: "Olá, Valeria! Gostaria de consultar os serviços e valores."
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
const servicesPriceList = document.querySelector("#services-price-list");
const servicesBeforeList = document.querySelector("#services-before-list");
const servicesAfterList = document.querySelector("#services-after-list");
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

function renderServicesDialog() {
  if (
    !(servicesPriceList instanceof HTMLTableSectionElement) ||
    !(servicesBeforeList instanceof HTMLUListElement) ||
    !(servicesAfterList instanceof HTMLUListElement)
  ) {
    console.error("Não foi possível encontrar as áreas de dados do quadro de serviços.");
    return;
  }

  const rows = CONFIG_SERVICOS.tabela.map((service) => {
    const row = document.createElement("tr");

    [service.procedimento, service.descricao, service.preco].forEach((value) => {
      const cell = document.createElement("td");
      cell.textContent = value;
      row.append(cell);
    });

    return row;
  });
  servicesPriceList.replaceChildren(...rows);

  const fillList = (list, items) => {
    list.replaceChildren(
      ...items.map((item) => {
        const entry = document.createElement("li");
        entry.textContent = item;
        return entry;
      })
    );
  };

  fillList(servicesBeforeList, CONFIG_SERVICOS.antes);
  fillList(servicesAfterList, CONFIG_SERVICOS.depois);
}

renderServicesDialog();

let lastServicesDialogTrigger = null;

if (
  servicesDialog instanceof HTMLDialogElement &&
  servicesDialogClose instanceof HTMLButtonElement
) {
  serviceDialogTriggers.forEach((trigger) => {
    trigger.addEventListener("click", () => {
      lastServicesDialogTrigger = trigger;
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
    if (lastServicesDialogTrigger?.isConnected) lastServicesDialogTrigger.focus();
    lastServicesDialogTrigger = null;
  });
} else {
  console.error("Não foi possível inicializar o quadro de serviços.");
}

function getPageFromHash() {
  const sectionId = decodeURIComponent(window.location.hash.slice(1));
  const target = document.getElementById(sectionId);
  return target?.closest(".page-panel")?.dataset.page || "sobre";
}

function showPage(pageId, updateHistory = false) {
  const activePanel = pagePanels.find((panel) => panel.dataset.page === pageId);
  if (!activePanel) return false;

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
  lightboxClose instanceof HTMLButtonElement
) {
  document.querySelectorAll(".gallery-item").forEach((item) => {
    item.addEventListener("click", () => {
      const preview = item.querySelector("img");
      const imageSource = item.dataset.lightboxSrc;
      if (!preview || !imageSource) return;

      lightboxImage.src = imageSource;
      lightboxImage.alt = preview.alt;
      lightboxCaption.textContent =
        item.querySelector(".gallery-caption")?.textContent.trim() || preview.alt;
      lastGalleryTrigger = item;
      galleryDialog.showModal();
    });
  });

  lightboxClose.addEventListener("click", () => galleryDialog.close());

  galleryDialog.addEventListener("click", (event) => {
    if (event.target === galleryDialog) galleryDialog.close();
  });

  galleryDialog.addEventListener("close", () => {
    lightboxImage.removeAttribute("src");
    lightboxImage.alt = "";
    lastGalleryTrigger?.focus();
    lastGalleryTrigger = null;
  });
}

// Define todos os destinos a partir de CONTATOS para evitar URLs duplicadas no HTML.
instagramLinks.forEach((link) => {
  link.href = CONTATOS.instagram;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
});

const whatsappDigits = CONTATOS.whatsapp.replace(/\D/g, "");

if (!whatsappDigits) {
  console.error("CONTATOS.whatsapp precisa incluir o código do país, DDD e número.");
} else {
  whatsappLinks.forEach((link) => {
    const message =
      link.dataset.whatsappMessage === "services"
        ? CONFIG_SERVICOS.mensagemWhatsapp
        : WHATSAPP_MESSAGE;

    link.href =
      `https://wa.me/${whatsappDigits}?text=${encodeURIComponent(message)}`;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
  });

  const formattedNumber =
    whatsappDigits.length === 13 && whatsappDigits.startsWith("55")
      ? `+55 (${whatsappDigits.slice(2, 4)}) ${whatsappDigits.slice(4, 9)}-${whatsappDigits.slice(9)}`
      : `+${whatsappDigits}`;

  whatsappNumberLabels.forEach((label) => {
    label.textContent = formattedNumber;
  });
}

if (currentYear) {
  currentYear.textContent = String(new Date().getFullYear());
}
