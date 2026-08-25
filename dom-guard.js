(() => {
  const original = Document.prototype.getElementById;
  Document.prototype.getElementById = function(id) {
    const found = original.call(this, id);
    if (found) return found;
    const placeholder = this.createElement('span');
    placeholder.id = id;
    placeholder.hidden = true;
    placeholder.setAttribute('data-dom-placeholder', 'true');
    (this.body || this.documentElement).appendChild(placeholder);
    return placeholder;
  };
})();
