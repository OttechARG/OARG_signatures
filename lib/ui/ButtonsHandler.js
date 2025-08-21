// ButtonsHandler.ts
/**
 * Creates a button and appends it to the specified container.
 * Avoids creating duplicates if an element with the same id already exists.
 *
 * @param container - The HTML container where the button should be appended
 * @param options - Configuration options for the button
 *   - id: optional unique id for the button
 *   - text: text to display on the button (optional if html is provided)
 *   - html: HTML content to display on the button (takes precedence over text)
 *   - onClick: callback function when clicked
 *   - style: optional CSS styles
 */
export function createButton(container, options) {
    if (!container)
        return;
    // Avoid duplicates if id is provided
    if (options.id && document.getElementById(options.id))
        return;
    const button = document.createElement("button");
    if (options.id)
        button.id = options.id;
    button.type = "button";
    // Set content - prefer html over text
    if (options.html) {
        button.innerHTML = options.html;
    }
    else if (options.text) {
        button.textContent = options.text;
    }
    // Apply custom styles if provided
    if (options.style) {
        Object.assign(button.style, options.style);
    }
    button.addEventListener("click", options.onClick);
    container.appendChild(button);
}
