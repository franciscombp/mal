document.addEventListener('DOMContentLoaded', () => {
  initTicket3D();
  initTerminal();
  initAccordion();
  initTabs();
  initCopyButtons();
  initTestimonialsCarousel();
  initTextMarquee();
  initFeatureStepper();
  initStackedCards();
  initThemeToggle();
  initMindMap(); // Added initMindMap call
  initBlogFetch(); // Added initBlogFetch call
});

/* ─── THEME TOGGLE ────────────────────────────────────────── */
function initThemeToggle() {
  const toggle = document.getElementById('theme-toggle');
  if (!toggle) return;

  const applyTheme = (theme) => {
    document.body.classList.remove('light-mode', 'dark-mode');
    document.body.classList.add(theme + '-mode');
    document.documentElement.setAttribute('data-theme', theme);
    /* el sistema central lee `data-tema="claro|oscuro"`, no `data-theme`:
       sin esta línea el botón cambiaba las clases del body y nada más. */
    document.documentElement.setAttribute('data-tema', theme === 'dark' ? 'oscuro' : 'claro');
    localStorage.setItem('theme', theme);
  };

  // Initial load
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme) {
    applyTheme(savedTheme);
  } else {
    // Respect system preference if no manual override
    const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    applyTheme(systemDark ? 'dark' : 'light');
  }

  toggle.addEventListener('click', () => {
    const isNowDark = document.body.classList.contains('dark-mode');
    applyTheme(isNowDark ? 'light' : 'dark');
  });

  // Listen for system changes
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
    if (!localStorage.getItem('theme')) {
      applyTheme(e.matches ? 'dark' : 'light');
    }
  });
}

/* ─── TABS GLOBAL LOGIC ────────────────────────────────────── */
function initTabs() {
  const triggers = document.querySelectorAll('.tab-trigger');
  triggers.forEach(trigger => {
    trigger.addEventListener('click', () => {
      const parent = trigger.parentElement;
      parent.querySelectorAll('.tab-trigger').forEach(t => t.classList.remove('active'));
      trigger.classList.add('active');

      // Optional: if data-target is provided, show/hide panels
      const targetId = trigger.getAttribute('data-target');
      if (targetId) {
        const panel = document.getElementById(targetId);
        if (panel) {
          panel.parentElement.querySelectorAll('.tab-panel').forEach(p => p.style.display = 'none');
          panel.style.display = 'block';
        }
      }
    });
  });
}

/* ─── COPY TO CLIPBOARD ────────────────────────────────────── */
function initCopyButtons() {
  const buttons = document.querySelectorAll('.btn-copy');
  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      const text = btn.getAttribute('data-copy');
      if (!text) return;

      navigator.clipboard.writeText(text).then(() => {
        const originalText = btn.textContent;
        btn.textContent = '¡Copiado!';
        btn.classList.add('copied');

        setTimeout(() => {
          btn.textContent = originalText;
          btn.classList.remove('copied');
        }, 2000);
      });
    });
  });
}

/* ─── 3D TICKET INTERACTION ────────────────────────────────── */
function initTicket3D() {
  const ticket = document.getElementById('ticket-3d');
  if (!ticket) return;

  ticket.addEventListener('mousemove', (e) => {
    const rect = ticket.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rotateX = (centerY - y) / 10;
    const rotateY = (x - centerX) / 10;

    ticket.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
  });

  ticket.addEventListener('mouseleave', () => {
    ticket.style.transform = `perspective(1000px) rotateX(0deg) rotateY(0deg)`;
  });
}

/* ─── TERMINAL ANIMATION ───────────────────────────────────── */
function initTerminal() {
  const lines = [
    { text: 'mal --whoami', delay: 500, type: 'input' },
    { text: 'Francisco Maldonado: Product Designer & Divulgador.', delay: 800, type: 'info' },
    { text: 'mal --experience', delay: 500, type: 'input' },
    { text: 'Collaborated with: Deuna!, KFC, Banco Pichincha, etc.', delay: 800, type: 'info' },
    { text: 'mal --specialty', delay: 500, type: 'input' },
    { text: 'UX/UI Strategy, Systemic Design, Mentorship.', delay: 800, type: 'success' },
    { text: 'mal --latest-post', delay: 500, type: 'input' },
    { text: 'Loading #MalPensamientos...', delay: 1200, type: 'info' },
    { text: '"Opiniones sin filtro que tu mamá ni tu jefe quieren que leas."', delay: 1500, type: 'success' }
  ];

  const terminalBody = document.getElementById('terminal-body');
  if (!terminalBody) return;

  let index = 0;
  function typeLine() {
    if (index >= lines.length) return;

    const line = lines[index];
    const div = document.createElement('div');
    div.className = `t-line ${line.type}`;

    if (line.type === 'input') {
      div.innerHTML = `<span class="t-prompt">$</span> <span class="t-text"></span>`;
      terminalBody.appendChild(div);
      const textSpan = div.querySelector('.t-text');
      let charIndex = 0;

      const interval = setInterval(() => {
        textSpan.textContent += line.text[charIndex];
        charIndex++;
        if (charIndex >= line.text.length) {
          clearInterval(interval);
          index++;
          setTimeout(typeLine, line.delay);
        }
      }, 50);
    } else {
      div.textContent = line.text;
      terminalBody.appendChild(div);
      index++;
      setTimeout(typeLine, line.delay);
    }
  }

  const observer = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting) {
      typeLine();
      observer.disconnect();
    }
  });
  observer.observe(terminalBody);
}

/* ─── ACCORDION GLOBAL LOGIC ────────────────────────────────── */
function initAccordion() {
  const headers = document.querySelectorAll('.accordion-header');
  headers.forEach(header => {
    header.addEventListener('click', () => {
      const item = header.parentElement;
      const content = header.nextElementSibling;
      const isActive = header.classList.contains('active');

      // Close all other items in the same accordion group (optional but cleaner)
      const group = item.parentElement;
      group.querySelectorAll('.accordion-header').forEach(h => {
        if (h !== header) {
          h.classList.remove('active');
          h.nextElementSibling.classList.remove('active');
          h.nextElementSibling.style.maxHeight = null;
        }
      });

      // Toggle current
      header.classList.toggle('active');
      content.classList.toggle('active');

      if (content.classList.contains('active')) {
        content.style.maxHeight = content.scrollHeight + "px";
      } else {
        content.style.maxHeight = null;
      }
    });
  });
}

const testimonialsData = [
  {
    quote: "Francisco fue puntual y estratégico en su valoración sobre mi case study. Sus consejos me ayudaron a definir mejor mi enfoque y mis próximos pasos.",
    name: "Nataly E. Sandoya",
    role: "UX/UI Designer, Freelance",
    flag: "🇪🇨"
  },
  {
    quote: "El nivel de conocimiento técnico, profesional y la capacidad de enseñanza de Francisco fueron claves, superó completamente mis expectativas.",
    name: "Julver",
    role: "UI Designer",
    flag: "🇵🇪"
  },
  {
    quote: "Francisco fue muy profesional y se tomó el tiempo para revisar cada detalle. Fue de gran ayuda para revisar errores y brindar revisiones.",
    name: "Catalina Kovacsy",
    role: "Graphic Design Student",
    flag: "🇮🇹"
  },
  {
    quote: "Tuve una mentoría muy provechosa. Respondió a todas mis preguntas con claridad y profundidad, demostrando un gran conocimiento y disposición para ayudar.",
    name: "Julián Echeverri Mejía",
    role: "Master in Digital Experiences, ICESI",
    flag: "🇨🇴"
  },
  {
    quote: "Muy pendiente y generoso con la información, fue una muy buena mentoría!!",
    name: "Johana Dávalos Carvajal",
    role: "Consultoría Gestión del Riesgo",
    flag: "🇨🇴"
  },
  {
    quote: "Francisco is a great colleague who has the precise advice for everything. I really appreciate his transparency and honesty in pointing out points where I can improve.",
    name: "David Luján",
    role: "Quality Assurance Specialist",
    flag: "🇵🇪"
  },
  {
    quote: "Francisco es un grande. Va al tema que querés saber y te ayuda muchísimo. Es claro, conciso y te dice cómo corregir errores. Más que recomendable.",
    name: "Marina Aizen",
    role: "Illustrator, Freelance",
    flag: "🇪🇸"
  },
  {
    quote: "Francisco es súper paciente y flexible; me dió muchísimas alternativas de solución, compartiendo herramientas y brindándome tips. Actualmente sigo sus consejos!",
    name: "Nora Itzel Martínez Juárez",
    role: "UX/UI Designer, Laboratoria",
    flag: "🇲🇽"
  },
  {
    quote: "La sesión superó mis espectativas, me ayudó mucho con mis habilidades para el proceso de entrevista, fue muy específico con cada paso.",
    name: "Cielo Inca",
    role: "UI Designer, Meant",
    flag: "🇵🇪"
  },
  {
    quote: "Great mentor! Extensive knowledge in product design.",
    name: "Hans Duque",
    role: "UX/UI Design Lead, Xtrim",
    flag: "🇪🇨"
  },
  {
    quote: "Francisco es un excelente mentor, me ayudó con todas mis dudas y consultas en el área. Lo recomiendo para recibir buenas críticas en diseño de producto 🙌",
    name: "Ayrton Lavayen",
    role: "Webflow Developer, Picker",
    flag: "🇪🇨"
  }
];

function initTestimonialsCarousel() {
  const container = document.getElementById('testimonials-carousel');
  if (!container) return;

  const track = container.querySelector('.carousel-track') || document.createElement('div');

  if (track.children.length === 0) {
    if (!track.parentElement) track.className = 'carousel-track';

    const getInitials = (name) => name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
    const getColor = (name) => {
      const colors = ['#6B7280', '#78716C', '#57534E', '#64748B', '#475569', '#52525B', '#71717A', '#737373', '#525252', '#404040'];
      let hash = 0;
      for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
      return colors[Math.abs(hash) % colors.length];
    };

    const allData = [...testimonialsData, ...testimonialsData];

    allData.forEach((t, index) => {
      const card = document.createElement('div');
      const variant = index % 3 === 0 ? 'accent' : (index % 5 === 0 ? 'pro' : '');
      card.className = `social-card ${variant}`;

      const getTag = (role) => {
        if (role.includes('Designer')) return { label: 'Design', style: 'rgba(45,106,159,0.1);color:rgb(91,159,204)' };
        if (role.includes('Developer')) return { label: 'Engineering', style: 'rgba(76,175,80,0.1);color:rgb(76,175,80)' };
        return { label: 'General', style: 'rgba(156,163,175,0.1);color:rgb(156,163,175)' };
      };

      const tag = getTag(t.role);

      card.innerHTML = `
        <div class="social-card-header">
          <span class="text-mono" style="font-size: 11px; opacity: 0.6;">Testimonial #${(index % testimonialsData.length) + 1}</span>
          <span class="tag" style="background: ${tag.style}; border: none; font-size: 9px; padding: 2px 8px;">${tag.label}</span>
        </div>
        <div class="social-card-body">"${t.quote}"</div>
        <div class="social-card-footer">
          <div class="social-avatar" style="background: ${getColor(t.name)}">${getInitials(t.name)}</div>
          <div class="social-info">
            <span class="social-name">${t.name} ${t.flag}</span>
            <span class="social-handle">${t.role}</span>
          </div>
        </div>
      `;
      track.appendChild(card);
    });
    if (!track.parentElement) container.appendChild(track);
  }

  let isDragging = false;
  let isHovered = false;
  let startX = 0;
  let currentTranslate = 0;
  let prevTranslate = 0;
  let velocity = 0;
  let lastX = 0;
  let animationId = 0;
  let autoSpeed = 0.5;
  let trackWidth = 0;

  const updateTrackWidth = () => {
    trackWidth = track.scrollWidth / 2;
  };

  updateTrackWidth();

  const setTransform = () => {
    if (Math.abs(currentTranslate) >= trackWidth) {
      currentTranslate = 0;
    } else if (currentTranslate > 0) {
      currentTranslate = -trackWidth;
    }
    track.style.transform = `translateX(${currentTranslate}px)`;
  }

  const animate = () => {
    if (isDragging) {
      // Manual drag handled in move
    } else if (isHovered) {
      // Pause
    } else {
      if (Math.abs(velocity) > 0.1) {
        currentTranslate += velocity;
        velocity *= 0.95;
      } else {
        currentTranslate -= autoSpeed;
      }
      setTransform();
    }
    animationId = requestAnimationFrame(animate);
  }

  container.addEventListener('mouseenter', () => isHovered = true);
  container.addEventListener('mouseleave', () => {
    isHovered = false;
    isDragging = false;
  });

  const onStart = (e) => {
    isDragging = true;
    startX = e.pageX || e.touches[0].pageX;
    lastX = startX;
    prevTranslate = currentTranslate;
    velocity = 0;
  }

  const onMove = (e) => {
    if (!isDragging) return;
    const x = e.pageX || e.touches[0].pageX;
    const walk = (x - startX);
    velocity = (x - lastX) * 0.8;
    lastX = x;
    currentTranslate = prevTranslate + walk;
    setTransform();
  }

  const onEnd = () => { isDragging = false; }

  track.addEventListener('mousedown', onStart);
  window.addEventListener('mousemove', onMove);
  window.addEventListener('mouseup', onEnd);

  track.addEventListener('touchstart', onStart);
  window.addEventListener('touchmove', onMove);
  window.addEventListener('touchend', onEnd);

  window.addEventListener('resize', updateTrackWidth);
  animate();
}

function initTextMarquee() {
  const containers = document.querySelectorAll('.marquee-container');
  containers.forEach(container => {
    const content = container.querySelector('.marquee-content');
    if (!content) return;

    // Clone content multiple times to ensure no gaps on wide screens
    for (let i = 0; i < 3; i++) {
      const clone = content.cloneNode(true);
      container.appendChild(clone);
    }

    let x = 0;
    let speed = 1.2;
    let isDragging = false;
    let startX = 0;
    let lastX = 0;
    let velocity = 0;

    const animate = () => {
      if (!isDragging) {
        if (Math.abs(velocity) > 0.1) {
          x += velocity;
          velocity *= 0.95;
        } else {
          x -= speed;
        }
      }

      const itemWidth = content.offsetWidth + 40; // Including gap
      if (x <= -itemWidth) x += itemWidth;
      if (x > 0) x -= itemWidth;

      container.querySelectorAll('.marquee-content').forEach(el => {
        el.style.transform = `translateX(${x}px)`;
      });

      requestAnimationFrame(animate);
    };

    const onStart = (e) => {
      isDragging = true;
      startX = e.pageX || e.touches[0].pageX;
      lastX = startX;
    };

    const onMove = (e) => {
      if (!isDragging) return;
      const currentX = e.pageX || e.touches[0].pageX;
      const diff = currentX - lastX;
      x += diff;
      velocity = diff;
      lastX = currentX;
    };

    const onEnd = () => { isDragging = false; };

    container.addEventListener('mousedown', onStart);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onEnd);
    container.addEventListener('touchstart', onStart);
    window.addEventListener('touchmove', onMove);
    window.addEventListener('touchend', onEnd);

    window.addEventListener('resize', () => {
      // Redundancy in case of orientation changes etc
    });

    animate();
  });
}

function initFeatureStepper() {
  const steps = document.querySelectorAll('.feature-step');
  steps.forEach(step => {
    step.addEventListener('click', () => {
      steps.forEach(s => s.classList.remove('active'));
      step.classList.add('active');
    });
  });
}

const portfolioCases = [
  {
    tag: "FINTECH / PAYMENTS",
    title: "Deuna!®",
    desc: "Rediseñar la experiencia de pago y cobro digital en Ecuador.",
    challenge: "Romper la dependencia del efectivo en un mercado tradicional.",
    impact: "Creación de la mayor red de comercios digitales del país.",
    link: "#"
  },
  {
    tag: "RETAIL / UX",
    title: "Kiosco KFC®",
    desc: "Optimización del flujo de auto-atención en restaurantes de comida rápida.",
    challenge: "Reducir tiempos de espera sin sacrificar ticket promedio.",
    impact: "Una interfaz que aceleró las ventas y mejoró la satisfacción.",
    link: "#"
  },
  {
    tag: "SECURITY / FAMILY",
    title: "Control Point",
    desc: "Seguridad logística y tecnológica en entornos escolares.",
    challenge: "Coordinar a padres y escuelas en el momento crítico de la salida.",
    impact: "Un sistema que devolvió la tranquilidad a cientos de familias.",
    link: "#"
  }
];

function initStackedCards() {
  const containers = document.querySelectorAll('.stacked-cards-container, .portfolio-stack');
  containers.forEach(container => {
    const isPortfolio = container.classList.contains('portfolio-stack');
    const cardClass = isPortfolio ? '.portfolio-card' : '.stacked-card';
    const originalCards = Array.from(container.querySelectorAll(cardClass));
    let cards = [...originalCards];
    if (cards.length === 0) return;

    // Content mapping for portfolio
    const section = container.closest('.portfolio-case') || container.closest('.sb-grid') || container.parentElement;
    const caseTag = section.querySelector('.case-tag');
    const caseTitle = section.querySelector('.case-title');
    const caseDesc = section.querySelector('.case-desc');
    const caseChallenge = section.querySelector('.case-challenge');
    const caseImpact = section.querySelector('.case-impact');
    const caseCta = section.querySelector('.case-cta');

    const nextBtn = section.querySelector('.nav-arrow:last-child');
    const prevBtn = section.querySelector('.nav-arrow:first-child');
    const dots = Array.from(section.querySelectorAll('.dot-indicator'));

    let currentIndex = 0;
    const totalCards = cards.length;

    const updateStack = () => {
      cards.forEach((card, i) => {
        card.style.zIndex = (cards.length - i).toString();
        const scale = 1 - (i * 0.05);
        const translateY = i * 12;
        const translateX = i * 12;
        card.style.opacity = "1";
        card.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`;
        card.style.pointerEvents = i === 0 ? 'auto' : 'none';
        card.style.transition = 'all 0.6s cubic-bezier(0.23, 1, 0.32, 1)';
      });

      // Update dots
      if (dots.length > 0) {
        dots.forEach((dot, i) => {
          dot.classList.toggle('active', i === currentIndex);
        });
      }

      // Sync Portfolio Content
      if (isPortfolio && portfolioCases[currentIndex]) {
        const data = portfolioCases[currentIndex];
        if (caseTag) caseTag.textContent = data.tag;
        if (caseTitle) caseTitle.textContent = data.title;
        if (caseDesc) caseDesc.textContent = data.desc;
        if (caseChallenge) caseChallenge.textContent = data.challenge;
        if (caseImpact) caseImpact.textContent = data.impact;
        if (caseCta) caseCta.setAttribute('href', data.link);
      }
    };

    const next = () => {
      const first = cards.shift();
      cards.push(first);
      currentIndex = (currentIndex + 1) % totalCards;
      updateStack();
    };

    const prev = () => {
      const last = cards.pop();
      cards.unshift(last);
      currentIndex = (currentIndex - 1 + totalCards) % totalCards;
      updateStack();
    };

    const goTo = (targetIndex) => {
      if (targetIndex === currentIndex) return;
      currentIndex = targetIndex;
      cards = [...originalCards.slice(targetIndex), ...originalCards.slice(0, targetIndex)];
      updateStack();
    };

    if (isPortfolio) {
      window.goToPortfolioIndex = goTo;
    }

    if (nextBtn) nextBtn.addEventListener('click', (e) => { e.preventDefault(); next(); });
    if (prevBtn) prevBtn.addEventListener('click', (e) => { e.preventDefault(); prev(); });

    let isDragging = false;
    let startX = 0;
    let diff = 0;

    const onStart = (x) => {
      isDragging = true;
      startX = x;
      cards[0].style.transition = 'none';
    };

    const onMove = (x) => {
      if (!isDragging) return;
      diff = x - startX;
      const rotation = diff / 20;
      cards[0].style.transform = `translate(${diff}px, ${Math.abs(diff) / 10}px) rotate(${rotation}deg)`;
      cards[0].style.opacity = "1";
    };

    const onEnd = () => {
      if (!isDragging) return;
      isDragging = false;
      if (Math.abs(diff) > 100) {
        if (diff > 0) prev();
        else next();
      } else {
        updateStack();
      }
      diff = 0;
    };

    container.addEventListener('mousedown', (e) => onStart(e.pageX));
    window.addEventListener('mousemove', (e) => onMove(e.pageX));
    window.addEventListener('mouseup', onEnd);
    container.addEventListener('touchstart', (e) => onStart(e.touches[0].pageX));
    window.addEventListener('touchmove', (e) => onMove(e.touches[0].pageX));
    window.addEventListener('touchend', onEnd);

    updateStack();
  });
}

/* ─── MIND MAP PARALLAX (SIMPLE & STABLE) ─── */
function initMindMap() {
  const container = document.querySelector('.mind-map-container');
  if (!container) return;
  const nodes = Array.from(container.querySelectorAll('.mind-map-node'));
  const centerNode = container.querySelector('.mind-map-center');
  const svg = container.querySelector('svg');
  if (!svg || !centerNode) return;

  // Virtual Coordinate System (Matches CSS Aspect Ratio 600x400)
  const V_WIDTH = 600;
  const V_HEIGHT = 400;

  // Center is true-mid
  const cx = 300;
  const cy = 200;

  // Nodes in a hexagon shape around the center
  const nodeP = [
    { x: 300, y: 50 },   // Top
    { x: 450, y: 120 },  // Top-Right
    { x: 480, y: 280 },  // Bottom-Right
    { x: 150, y: 120 },  // Top-Left
    { x: 120, y: 280 },  // Bottom-Left
    { x: 300, y: 350 }   // Bottom
  ];

  svg.innerHTML = '';
  const linesGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  linesGroup.setAttribute('stroke', 'hsl(var(--text-100) / 0.15)');
  linesGroup.setAttribute('stroke-width', '1.5');
  linesGroup.setAttribute('stroke-dasharray', '4 4');
  svg.appendChild(linesGroup);

  const lines = [];

  nodes.forEach((node, i) => {
    node.baseX = nodeP[i].x;
    node.baseY = nodeP[i].y;
    node.currX = nodeP[i].x;
    node.currY = nodeP[i].y;

    // Set natural CSS constraints so it resizes gracefully
    node.style.left = (node.baseX / V_WIDTH * 100) + '%';
    node.style.top = (node.baseY / V_HEIGHT * 100) + '%';
    node.style.position = 'absolute';
    node.style.transform = 'translate(-50%, -50%)';
    node.style.transition = 'none';

    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    linesGroup.appendChild(line);
    lines.push(line);
  });

  centerNode.baseX = cx;
  centerNode.baseY = cy;
  centerNode.currX = cx;
  centerNode.currY = cy;
  centerNode.style.left = (cx / V_WIDTH * 100) + '%';
  centerNode.style.top = (cy / V_HEIGHT * 100) + '%';
  centerNode.style.position = 'absolute';
  centerNode.style.transform = 'translate(-50%, -50%)';

  let targetX = 0;
  let targetY = 0;
  let isHovering = false;

  container.addEventListener('mousemove', (e) => {
    const rect = container.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Normalized [-1, 1] relative to center
    targetX = ((x / rect.width) - 0.5) * 2;
    targetY = ((y / rect.height) - 0.5) * 2;
    isHovering = true;
  });

  container.addEventListener('mouseleave', () => {
    isHovering = false;
  });

  function update() {
    const rect = container.getBoundingClientRect();
    if (rect.width === 0) { requestAnimationFrame(update); return; }

    // Match virtual grid
    svg.setAttribute('viewBox', `0 0 ${V_WIDTH} ${V_HEIGHT}`);

    let lerpX = isHovering ? targetX : 0;
    let lerpY = isHovering ? targetY : 0;

    // Calculate Center Parallax (opposites)
    let cTargetX = cx - (lerpX * 25);
    let cTargetY = cy - (lerpY * 15);
    centerNode.currX += (cTargetX - centerNode.currX) * 0.1;
    centerNode.currY += (cTargetY - centerNode.currY) * 0.1;

    // Apply to CSS transform
    centerNode.style.transform = `translate(calc(-50% + ${centerNode.currX - cx}px), calc(-50% + ${centerNode.currY - cy}px))`;

    nodes.forEach((node, i) => {
      // Node parallax follows mouse, varying depth
      let depth = (i % 2 === 0) ? 40 : 25;
      let nTargetX = node.baseX + (lerpX * depth);
      let nTargetY = node.baseY + (lerpY * depth);

      node.currX += (nTargetX - node.currX) * 0.08;
      node.currY += (nTargetY - node.currY) * 0.08;

      node.style.transform = `translate(calc(-50% + ${node.currX - node.baseX}px), calc(-50% + ${node.currY - node.baseY}px))`;

      if (lines[i]) {
        lines[i].setAttribute('x1', centerNode.currX);
        lines[i].setAttribute('y1', centerNode.currY);
        lines[i].setAttribute('x2', node.currX);
        lines[i].setAttribute('y2', node.currY);
      }
    });

    requestAnimationFrame(update);
  }

  update();
}

/* ─── BLOG FETCH FROM SUBSTACK ─── */
async function initBlogFetch() {
  const blogGrid = document.getElementById('blog-grid');
  if (!blogGrid) return;

  try {
    const res = await fetch('https://api.allorigins.win/raw?url=' + encodeURIComponent('https://franmaldonado.substack.com/api/v1/posts?limit=3'));
    if (!res.ok) throw new Error('Network response was not ok');
    const posts = await res.json();

    // Clear initial/skeleton content
    blogGrid.innerHTML = '';

    const styles = [
      'linear-gradient(135deg, hsl(355, 66.67%, 45%), hsl(235, 85%, 65%)); mix-blend-mode: multiply;',
      'linear-gradient(45deg, hsl(45, 50%, 60%), hsl(355, 40%, 40%));',
      'linear-gradient(200deg, hsl(235, 60%, 50%), hsl(45, 80%, 70%));'
    ];

    posts.forEach((post, i) => {
      const date = new Date(post.post_date).toLocaleDateString('es-ES', { month: 'long', day: 'numeric', year: 'numeric' });
      const formattedDate = date.charAt(0).toUpperCase() + date.slice(1);

      const card = document.createElement('a');
      card.href = post.canonical_url;
      card.target = '_blank';
      card.className = 'blog-card';
      card.style.gridColumn = 'span 1';

      card.innerHTML = `
          <div class="blog-card-image">
              ${post.cover_image ? `<img src="${post.cover_image}" alt="Cover image">` : ''}
              <div style="width: 100%; height: 100%; background: ${styles[i % 3]} opacity: 0.8; position: absolute; top: 0; left: 0;"></div>
          </div>
          <div class="blog-card-content" style="position: relative; z-index: 1;">
              <div class="blog-card-meta">
                  <span>ARTÍCULO</span>
              </div>
              <h3 class="blog-card-title">${post.title}</h3>
              <p class="blog-card-excerpt">${post.description || ''}</p>
              
              <div class="author-meta">
                  <div class="author-avatar">
                      <img src="assets/fran.jpeg" alt="Francisco Maldonado">
                  </div>
                  <div class="author-info">
                      <span class="author-name">Francisco Maldonado</span>
                      <span class="author-date">${formattedDate}</span>
                  </div>
              </div>
          </div>
      `;
      blogGrid.appendChild(card);
    });
  } catch (error) {
    console.error('Error fetching blog posts:', error);
  }
}

