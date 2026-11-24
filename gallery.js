const cover = document.querySelector('#cover-image');
const workCount = document.querySelector('#work-count');
const cards = [...document.querySelectorAll('.category')];
const priceToggle = document.querySelector('#price-toggle');
const pricePanel = document.querySelector('#price-content');
const priceText = document.querySelector('#price-text');
const dialog = document.querySelector('#gallery');
const grid = document.querySelector('#gallery-grid');
const viewer = document.querySelector('#viewer');
const viewerImage = document.querySelector('#viewer-image');
const viewerCaption = document.querySelector('#viewer-caption');
const galleryBody = document.querySelector('#gallery-body');
const closeButton = document.querySelector('#gallery-close');
const backButton = document.querySelector('#viewer-back');
const prevButton = document.querySelector('#viewer-prev');
const nextButton = document.querySelector('#viewer-next');
const number = new Intl.NumberFormat('en');
let activeWorks = [];
let activeIndex = 0;
let gridScroll = 0;
let activeCard;

function workLabel(count) {
  return number.format(count) + (count === 1 ? ' work' : ' works');
}

function setPriceOpen(open) {
  priceToggle.setAttribute('aria-expanded', String(open));
  pricePanel.hidden = !open;
  priceToggle.querySelector('.price-action > span').textContent = open ? 'Close' : 'Open';
}

function renderPrice(text) {
  priceText.replaceChildren();
  for (const line of text.split(/\r?\n/).filter(Boolean)) {
    const [title, ...prices] = line.split('|').map((value) => value.trim());
    const heading = document.createElement('h3');
    heading.textContent = title;
    const row = document.createElement('section');
    row.className = 'price-row';
    row.append(heading);
    for (const price of prices) {
      const item = document.createElement('p');
      const amount = price.search(/\+?\$|\+\d+%/);
      item.textContent = amount >= 0 ? price.slice(0, amount).trim() : price;
      if (amount >= 0) {
        const value = document.createElement('strong');
        value.textContent = price.slice(amount);
        item.append(value);
      }
      row.append(item);
    }
    priceText.append(row);
  }
}

function showWork(index) {
  if (viewer.hidden) gridScroll = galleryBody.scrollTop;
  activeIndex = (index + activeWorks.length) % activeWorks.length;
  viewerImage.src = activeWorks[activeIndex];
  viewerImage.alt = 'Illustration ' + (activeIndex + 1) + ' of ' + activeWorks.length;
  viewerCaption.textContent = (activeIndex + 1) + ' / ' + activeWorks.length;
  grid.hidden = true;
  if (viewer.hidden) {
    viewer.hidden = false;
    backButton.focus();
  }
  galleryBody.scrollTop = 0;
}

function showGrid() {
  viewer.hidden = true;
  viewerImage.removeAttribute('src');
  grid.hidden = false;
  galleryBody.scrollTop = gridScroll;
  const selected = grid.children[activeIndex];
  selected?.focus({ preventScroll: true });
  selected?.scrollIntoView({ block: 'nearest', behavior: 'instant' });
}

function openGallery(card, works) {
  activeCard = card;
  activeWorks = works;
  activeIndex = 0;
  gridScroll = 0;
  prevButton.hidden = nextButton.hidden = works.length < 2;
  document.querySelector('#gallery-title').textContent = card.dataset.category.toUpperCase();
  grid.replaceChildren(...works.map((src, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'work';
    button.setAttribute('aria-label', 'View artwork ' + (index + 1));
    const image = document.createElement('img');
    image.src = src;
    image.alt = '';
    image.loading = 'lazy';
    image.decoding = 'async';
    button.append(image);
    button.addEventListener('click', () => showWork(index));
    return button;
  }));
  viewer.hidden = true;
  grid.hidden = false;
  dialog.showModal();
  document.body.classList.add('modal-open');
  galleryBody.scrollTop = 0;
  closeButton.focus();
}

priceToggle.addEventListener('click', () => setPriceOpen(pricePanel.hidden));
document.querySelector('#price-nav').addEventListener('click', () => {
  setPriceOpen(true);
  priceToggle.focus();
});
closeButton.addEventListener('click', () => dialog.close());
backButton.addEventListener('click', showGrid);
prevButton.addEventListener('click', () => showWork(activeIndex - 1));
nextButton.addEventListener('click', () => showWork(activeIndex + 1));
dialog.addEventListener('click', (event) => {
  if (event.target === dialog) dialog.close();
});
dialog.addEventListener('close', () => {
  document.body.classList.remove('modal-open');
  viewerImage.removeAttribute('src');
  grid.replaceChildren();
  activeCard?.focus({ preventScroll: true });
});
dialog.addEventListener('keydown', (event) => {
  if (viewer.hidden) return;
  if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
    event.preventDefault();
    showWork(activeIndex + (event.key === 'ArrowLeft' ? -1 : 1));
  }
});
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && !dialog.open && !pricePanel.hidden) setPriceOpen(false);
});

async function loadPortfolio() {
  const response = await fetch('./portfolio.json');
  if (!response.ok) throw new Error('Failed to load portfolio');
  const data = await response.json();
  let lastCover;
  try { lastCover = sessionStorage.getItem('last-cover'); } catch {}
  const options = data.covers.length > 1
    ? data.covers.filter(({ name }) => name !== lastCover)
    : data.covers;
  if (options.length) {
    const selectedCover = options[Math.floor(Math.random() * options.length)];
    cover.src = selectedCover.src;
    cover.style.objectPosition = selectedCover.position || 'center';
    cover.hidden = false;
    try { sessionStorage.setItem('last-cover', selectedCover.name); } catch {}
  }
  renderPrice(data.price || 'No prices listed yet.');
  let total = 0;
  for (const card of cards) {
    const { thumbnail, works } = data.categories[card.dataset.category];
    total += works.length;
    card.querySelector('.category-count').textContent = workLabel(works.length);
    if (!thumbnail) continue;
    const image = card.querySelector('img');
    image.src = thumbnail;
    image.hidden = false;
    card.disabled = false;
    card.addEventListener('click', () => openGallery(card, works));
  }
  workCount.textContent = workLabel(total);
}

loadPortfolio().catch(() => {
  document.querySelector('#load-error').hidden = false;
  priceText.textContent = 'Could not load the price list.';
});
