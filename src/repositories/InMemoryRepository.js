const { randomUUID } = require('crypto');

/**
 * Repositório genérico com persistência em memória.
 *
 * Os métodos sempre devolvem cópias das entidades, evitando que quem os chama
 * altere o estado interno sem passar pelo repositório. Trocar por um banco de
 * dados real exigiria apenas outra implementação com a mesma interface.
 */
class InMemoryRepository {
  #items = new Map();

  create(data) {
    const entity = { id: randomUUID(), ...data };
    this.#items.set(entity.id, entity);
    return { ...entity };
  }

  findById(id) {
    const entity = this.#items.get(id);
    return entity ? { ...entity } : null;
  }

  /** Lista as entidades que satisfazem o predicado (todas, por padrão). */
  findAll(predicate = () => true) {
    return [...this.#items.values()].filter(predicate).map((entity) => ({ ...entity }));
  }

  /** Mescla `data` na entidade existente. Retorna `null` se ela não existir. */
  update(id, data) {
    const current = this.#items.get(id);
    if (!current) return null;

    const updated = { ...current, ...data, id };
    this.#items.set(id, updated);
    return { ...updated };
  }

  /** Remove a entidade. Retorna `true` se ela existia. */
  delete(id) {
    return this.#items.delete(id);
  }
}

module.exports = InMemoryRepository;
