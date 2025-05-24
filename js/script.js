// Check if device is mobile
const isMobile = () => window.innerWidth <= 768;

// Load token data
const loadTokenData = async () => {
  try {
    const response = await fetch(pluginData.jsonUrl);
    if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error loading JSON file:", error);
    return null;
  }
};

// Group tokens into sections and modes
const groupTokensByTable = (data) => {
  const grouped = {};
  data.forEach((collection) => {
    const collectionName = collection.name;
    if (!grouped[collectionName]) grouped[collectionName] = {};
    collection.values.forEach((mode) => {
      const modeName = mode.mode.name;
      Object.keys(mode).forEach((tokenType) => {
        if (tokenType === 'mode' || !Array.isArray(mode[tokenType])) return; // Skip invalid properties
        mode[tokenType].forEach((token) => {
          const parts = token.name.split('/');
          const sectionName = parts[1] || 'General'; // Use the second part or fallback to 'General'
          if (!grouped[collectionName][sectionName]) {
            grouped[collectionName][sectionName] = {};
          }
          if (!grouped[collectionName][sectionName][modeName]) {
            grouped[collectionName][sectionName][modeName] = [];
          }
          grouped[collectionName][sectionName][modeName].push({
            tokenType,
            tokenName: token.name,
            value: token.var || token.value,
            hex: token.value, // Only relevant for color tokens
            isVariable: !!token.var, // Check if the value is a variable
            description: token.description || '', // Add description property
          });
        });
      });
    });
  });
  return grouped;
};

// Render the token palette (default or mobile layout based on screen size)
const renderTokenPalette = async () => {
  const container = document.getElementById('figma-color-palette');
  if (!container) return;

  const data = await loadTokenData();
  if (!data) {
    container.innerHTML = '<p>Error loading token palette.</p>';
    return;
  }

  const groupedTokens = groupTokensByTable(data);

  container.innerHTML = isMobile()
    ? renderMobileCards(groupedTokens) // Mobile card view
    : renderTables(groupedTokens); // Desktop table view

  setupCopyButtons();
};

// Render the token palette as mobile cards
const renderMobileCards = (groupedTokens) => {
  return Object.entries(groupedTokens)
    .map(
      ([collectionName, subsections]) => `
      <div class="token-collection">
        <h2>${collectionName}</h2>
        ${renderMobileSubsections(subsections)}
      </div>
    `
    )
    .join('');
};

const renderMobileSubsections = (subsections) => {
  return Object.entries(subsections)
    .map(
      ([sectionName, modes]) => `
      <div class="token-section">
        <h3>${sectionName}</h3>
        ${renderMobileCardsForModes(modes)}
      </div>
    `
    )
    .join('');
};

const renderMobileCardsForModes = (modes) => {
  const modeNames = Object.keys(modes);
  const allTokens = Object.values(modes).flat();
  const uniqueTokens = [
    ...new Map(
      allTokens.map((item) => [item.tokenName, item])
    ).values(),
  ];

  return uniqueTokens
    .map((token) => `
      <div class="token-card">
        <div class="token-name">${token.tokenName}</div>
        ${token.description ? `<div class="token-description">${token.description}</div>` : ''}
        <div class="token-values">
          ${modeNames
            .map((mode) => {
              const modeValue = modes[mode].find(
                (m) => m.tokenName === token.tokenName
              );
              return `
              <div class="token-value">
                <span class="mode-name">${mode}</span>: 
                ${
                  token.tokenType === 'color' && modeValue && isColor(sanitizeColor(modeValue.hex))
                    ? `<span class="color-circle" data-token="${token.tokenName}" style="--color: ${sanitizeColor(modeValue.hex)};"></span>`
                    : ''
                }
                ${
                  modeValue?.isVariable
                    ? `<div class="value-rectangle">
      ${modeValue.value}<button class="copy-btn" data-token="${modeValue.value}" title="Copy">📋</button>
    </div>
    ${token.description ? `<div class="token-description">${token.description}</div>` : ''}`
                    : modeValue?.value || '-'
                }
              </div>`;
            })
            .join('')}
        </div>
      </div>
    `)
    .join('');
};

// Render tables for desktop
const renderTables = (groupedTokens) => {
  return Object.entries(groupedTokens)
    .map(
      ([collectionName, subsections]) => `
      <div class="token-collection">
        <h2>${collectionName}</h2>
        ${renderSubsectionTables(subsections)}
      </div>
    `
    )
    .join('');
};

const renderSubsectionTables = (subsections) => {
  return Object.entries(subsections)
    .map(
      ([sectionName, modes]) => `
      <div class="token-section">
        <h3>${sectionName}</h3>
        ${renderModeTable(modes)}
      </div>
    `
    )
    .join('');
};

const renderModeTable = (modes) => {
  const modeNames = Object.keys(modes);

  return `
    <table class="token-table">
      <thead>
        <tr>
          <th style="width: ${100 / (modeNames.length + 1)}%;">Token</th>
          ${modeNames
            .map(
              (mode) =>
                `<th style="width: ${100 / (modeNames.length + 1)}%;">${mode}</th>`
            )
            .join('')}
        </tr>
      </thead>
      <tbody>
        <tr class="table-divider">
          <td colspan="${modeNames.length + 1}"></td>
        </tr>
        ${renderTableRows(modes, modeNames)}
      </tbody>
    </table>
  `;
};

// Render rows for the table
const renderTableRows = (modes, modeNames) => {
  const allTokens = Object.values(modes).flat();
  const uniqueTokens = [
    ...new Map(
      allTokens.map((item) => [item.tokenName, item])
    ).values(),
  ];

  return uniqueTokens
    .map((token) => `
      <tr>
        <td>
          <span class="token-name-text value-rectangle">
            ${token.tokenName}
            ${token.description ? `<div class="token-description-inline">${token.description}</div>` : ''}
            <button class="copy-btn" data-token="${token.tokenName}" title="Copy">📋</button>
          </span>
        </td>
        ${modeNames
          .map(
            (mode) => {
              const modeValue = modes[mode].find(
                (m) => m.tokenName === token.tokenName
              );
              return `
              <td>
                ${
                  token.tokenType === 'color' && modeValue && isColor(sanitizeColor(modeValue.hex))
                    ? `<span class="color-circle" data-token="${token.tokenName}" style="--color: ${sanitizeColor(modeValue.hex)};"></span>`
                    : ''
                }
                ${
                  modeValue?.isVariable
                    ? `<div class="value-rectangle">
      ${modeValue.value}<button class="copy-btn" data-token="${modeValue.value}" title="Copy">📋</button>
    </div>
    ${token.description ? `<div class="token-description">${token.description}</div>` : ''}`
                    : modeValue?.value || '-'
                }
              </td>`;
            }
          )
          .join('')}
      </tr>
    `)
    .join('');
};

// Helper function to determine if a string is a valid color
const isColor = (value) => /^#[0-9a-fA-F]{6,8}$/.test(value);

// Sanitize hex colors: treat NaNNaNNaNNaN as distinct striped background
const sanitizeColor = (value) => {
  if (value && value.includes('NaN')) {
    return 'repeating-linear-gradient(45deg, #f0f0f0 0 5px, #ccc 5px 10px)'; 
    // visibly distinct striped background
  }
  return value;
};

const setupCopyButtons = () => {
  document.querySelectorAll('.copy-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const token = btn.getAttribute('data-token');
      navigator.clipboard.writeText(token).then(() => {
        btn.textContent = '📋';
        setTimeout(() => {
          btn.textContent = '✅';
        }, 1000);
      });
    });
  });

  document.querySelectorAll('.color-circle').forEach((circle) => {
    circle.addEventListener('click', () => {
      const token = circle.getAttribute('data-token');
      if (token) {
        navigator.clipboard.writeText(token).then(() => {
          circle.classList.add('copied');
          setTimeout(() => {
            circle.classList.remove('copied');
          }, 1000);
        });
      }
    });
  });
};

// Initialize the palette rendering
document.addEventListener('DOMContentLoaded', renderTokenPalette);
window.addEventListener('resize', renderTokenPalette);