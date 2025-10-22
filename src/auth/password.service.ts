import { Injectable, Logger } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { createHash } from 'crypto';

@Injectable()
export class PasswordService {
  private readonly logger = new Logger(PasswordService.name);
  private readonly bcryptSaltRounds = 12;

  async hash(password: string): Promise<string> {
    return bcrypt.hash(password, this.bcryptSaltRounds);
  }

  async verify(password: string, storedValue?: string | null): Promise<boolean> {
    if (!storedValue) {
      return false;
    }

    const normalized = storedValue.trim();
    const candidate = password.trim();

    if (!normalized) {
      return false;
    }

    if (normalized.startsWith('$2a$') || normalized.startsWith('$2b$') || normalized.startsWith('$2y$')) {
      return bcrypt.compare(candidate, normalized);
    }

    if (this.isHexOfLength(normalized, 64)) {
      const sha256 = createHash('sha256').update(candidate).digest('hex');
      return sha256.toLowerCase() === normalized.toLowerCase();
    }

    if (this.isHexOfLength(normalized, 40)) {
      const sha1 = createHash('sha1').update(candidate).digest('hex');
      return sha1.toLowerCase() === normalized.toLowerCase();
    }

    if (this.isHexOfLength(normalized, 32)) {
      const md5 = createHash('md5').update(candidate).digest('hex');
      return md5.toLowerCase() === normalized.toLowerCase();
    }

    if (candidate === normalized) {
      return true;
    }

    if (candidate.toLowerCase() === normalized.toLowerCase()) {
      this.logger.warn('Senha em texto puro comparada de forma case-insensitive. Ajuste a senha para diferenciar maiusculas/minusculas ou migre para hashing seguro.');
      return true;
    }

    const matches = password === normalized;
    if (matches) {
      this.logger.warn('Senha armazenada em texto puro. Considere migrar para hashing seguro (bcrypt).');
    }
    return matches;
  }

  private isHexOfLength(value: string, length: number): boolean {
    return value.length === length && /^[0-9a-fA-F]+$/.test(value);
  }
}
