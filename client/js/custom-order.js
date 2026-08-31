/**
 * Custom Studio — a 6-step custom clothing request wizard.
 * Steps: clothing type -> options -> description -> reference upload ->
 * contact details -> review & submit.
 */

const TOTAL_STUDIO_STEPS = 6;

const studioState = {
  step: 1,
  clothingType: '',
  size: '',
  color: '',
  fitStyle: '',
  designDescription: '',
  designNotes: '',
  file: null,
  customerName: '',
  email: '',
  phone: '',
};

function initCustomStudio() {
  const root = document.getElementById('studio-root');
  if (!root) return;

  const user = RaversAuth.getUser();
  if (user) {
    studioState.customerName = user.name;
    studioState.email = user.email;
  }

  bindClothingTypeStep();
  bindOptionsStep();
  bindDescriptionStep();
  bindUploadStep();
  bindContactStep();
  bindStepNav();

  renderStepper();
  goToStep(1);
}

function goToStep(step) {
  studioState.step = step;
  RaversUtils.qsa('.studio-step').forEach((el) => {
    el.classList.toggle('is-active', Number(el.dataset.step) === step);
  });
  if (step === TOTAL_STUDIO_STEPS) renderReview();
  renderStepper();
  window.scrollTo({ top: document.getElementById('studio-root').offsetTop - 100, behavior: 'smooth' });
}

function renderStepper() {
  RaversUtils.qsa('.stepper__step').forEach((el) => {
    const stepNum = Number(el.dataset.step);
    el.classList.toggle('is-active', stepNum === studioState.step);
    el.classList.toggle('is-complete', stepNum < studioState.step);
  });
}

function showStepError(step, message) {
  const el = document.querySelector(`.studio-step[data-step="${step}"] .js-step-error`);
  if (!el) return;
  el.textContent = message;
  el.hidden = !message;
}

function validateStep(step) {
  showStepError(step, '');
  switch (step) {
    case 1:
      if (!studioState.clothingType) {
        showStepError(1, 'Choose a clothing type to continue.');
        return false;
      }
      return true;
    case 2:
      if (!studioState.size) {
        showStepError(2, 'Choose a size to continue.');
        return false;
      }
      return true;
    case 3:
      if (studioState.designDescription.trim().length < 10) {
        showStepError(3, 'Add a little more detail about the design (at least 10 characters).');
        return false;
      }
      return true;
    case 5:
      if (!studioState.customerName.trim() || !studioState.email.trim() || !studioState.phone.trim()) {
        showStepError(5, 'Name, email, and phone are required.');
        return false;
      }
      return true;
    default:
      return true;
  }
}

function bindStepNav() {
  RaversUtils.qsa('.js-step-next').forEach((btn) => {
    btn.addEventListener('click', () => {
      const current = studioState.step;
      if (!validateStep(current)) return;
      goToStep(Math.min(current + 1, TOTAL_STUDIO_STEPS));
    });
  });
  RaversUtils.qsa('.js-step-back').forEach((btn) => {
    btn.addEventListener('click', () => goToStep(Math.max(studioState.step - 1, 1)));
  });
}

function bindClothingTypeStep() {
  RaversUtils.qsa('.js-clothing-type').forEach((btn) => {
    btn.addEventListener('click', () => {
      RaversUtils.qsa('.js-clothing-type').forEach((b) => b.setAttribute('aria-pressed', 'false'));
      btn.setAttribute('aria-pressed', 'true');
      studioState.clothingType = btn.dataset.type;
    });
  });
}

function bindOptionsStep() {
  RaversUtils.qsa('.js-size-choice').forEach((btn) => {
    btn.addEventListener('click', () => {
      RaversUtils.qsa('.js-size-choice').forEach((b) => b.setAttribute('aria-pressed', 'false'));
      btn.setAttribute('aria-pressed', 'true');
      studioState.size = btn.dataset.size;
    });
  });
  RaversUtils.qsa('.js-color-choice').forEach((btn) => {
    btn.addEventListener('click', () => {
      RaversUtils.qsa('.js-color-choice').forEach((b) => b.setAttribute('aria-pressed', 'false'));
      btn.setAttribute('aria-pressed', 'true');
      studioState.color = btn.dataset.color;
    });
  });
  RaversUtils.qsa('.js-fit-choice').forEach((btn) => {
    btn.addEventListener('click', () => {
      RaversUtils.qsa('.js-fit-choice').forEach((b) => b.setAttribute('aria-pressed', 'false'));
      btn.setAttribute('aria-pressed', 'true');
      studioState.fitStyle = btn.dataset.fit;
    });
  });
}

function bindDescriptionStep() {
  const desc = document.getElementById('design-description');
  const notes = document.getElementById('design-notes');
  if (desc) desc.addEventListener('input', (e) => { studioState.designDescription = e.target.value; });
  if (notes) notes.addEventListener('input', (e) => { studioState.designNotes = e.target.value; });
}

function bindUploadStep() {
  const dropzone = document.getElementById('upload-dropzone');
  const input = document.getElementById('reference-file-input');
  const preview = document.getElementById('upload-preview');
  if (!dropzone || !input) return;

  dropzone.addEventListener('click', () => input.click());

  input.addEventListener('change', () => {
    const file = input.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      showStepError(4, 'File is too large — please keep it under 5MB.');
      input.value = '';
      return;
    }
    showStepError(4, '');
    studioState.file = file;
    dropzone.classList.add('has-file');

    preview.hidden = false;
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => {
        preview.innerHTML = `<img src="${reader.result}" alt="Reference preview"><span>${RaversUtils.escapeHtml(file.name)}</span>`;
      };
      reader.readAsDataURL(file);
    } else {
      preview.innerHTML = `<span>${RaversUtils.escapeHtml(file.name)}</span>`;
    }
  });
}

function bindContactStep() {
  const nameInput = document.getElementById('studio-name');
  const emailInput = document.getElementById('studio-email');
  const phoneInput = document.getElementById('studio-phone');

  if (nameInput) {
    nameInput.value = studioState.customerName;
    nameInput.addEventListener('input', (e) => { studioState.customerName = e.target.value; });
  }
  if (emailInput) {
    emailInput.value = studioState.email;
    emailInput.addEventListener('input', (e) => { studioState.email = e.target.value; });
  }
  if (phoneInput) {
    phoneInput.addEventListener('input', (e) => { studioState.phone = e.target.value; });
  }
}

function renderReview() {
  const el = document.getElementById('review-summary');
  if (!el) return;

  const rows = [
    ['Clothing type', studioState.clothingType],
    ['Size', studioState.size],
    ['Color', studioState.color || 'Not specified'],
    ['Fit / style', studioState.fitStyle || 'Not specified'],
    ['Design description', studioState.designDescription],
    ['Design notes', studioState.designNotes || 'None'],
    ['Reference file', studioState.file ? studioState.file.name : 'None attached'],
    ['Name', studioState.customerName],
    ['Email', studioState.email],
    ['Phone', studioState.phone],
  ];

  el.innerHTML = rows
    .map(
      ([label, value]) => `
      <div class="review-summary__row">
        <dt>${RaversUtils.escapeHtml(label)}</dt>
        <dd>${RaversUtils.escapeHtml(value)}</dd>
      </div>`
    )
    .join('');
}

async function submitCustomOrder() {
  const submitBtn = document.getElementById('studio-submit-btn');
  const errorBox = document.getElementById('studio-submit-error');
  errorBox.hidden = true;
  setButtonLoading(submitBtn, true);

  const formData = new FormData();
  formData.append('clothingType', studioState.clothingType);
  formData.append('size', studioState.size);
  formData.append('color', studioState.color);
  formData.append('fitStyle', studioState.fitStyle);
  formData.append('designDescription', studioState.designDescription);
  formData.append('designNotes', studioState.designNotes);
  formData.append('customerName', studioState.customerName);
  formData.append('email', studioState.email);
  formData.append('phone', studioState.phone);
  if (studioState.file) formData.append('referenceImage', studioState.file);

  try {
    const { data } = await RaversAPI.customOrders.submit(formData);
    showStudioConfirmation(data.customOrder.referenceNumber);
  } catch (err) {
    errorBox.textContent = err.message;
    errorBox.hidden = false;
    setButtonLoading(submitBtn, false);
  }
}

function showStudioConfirmation(referenceNumber) {
  document.getElementById('studio-wizard').hidden = true;
  const confirmation = document.getElementById('studio-confirmation');
  confirmation.hidden = false;
  document.getElementById('confirmation-reference').textContent = referenceNumber;
}

document.addEventListener('DOMContentLoaded', () => {
  initCustomStudio();
  const submitBtn = document.getElementById('studio-submit-btn');
  if (submitBtn) submitBtn.addEventListener('click', submitCustomOrder);
});
