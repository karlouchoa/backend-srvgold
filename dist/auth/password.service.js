"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var PasswordService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PasswordService = void 0;
const common_1 = require("@nestjs/common");
const bcrypt = __importStar(require("bcrypt"));
const crypto_1 = require("crypto");
let PasswordService = PasswordService_1 = class PasswordService {
    logger = new common_1.Logger(PasswordService_1.name);
    bcryptSaltRounds = 12;
    async hash(password) {
        return bcrypt.hash(password, this.bcryptSaltRounds);
    }
    async verify(password, storedValue) {
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
            const sha256 = (0, crypto_1.createHash)('sha256').update(candidate).digest('hex');
            return sha256.toLowerCase() === normalized.toLowerCase();
        }
        if (this.isHexOfLength(normalized, 40)) {
            const sha1 = (0, crypto_1.createHash)('sha1').update(candidate).digest('hex');
            return sha1.toLowerCase() === normalized.toLowerCase();
        }
        if (this.isHexOfLength(normalized, 32)) {
            const md5 = (0, crypto_1.createHash)('md5').update(candidate).digest('hex');
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
    isHexOfLength(value, length) {
        return value.length === length && /^[0-9a-fA-F]+$/.test(value);
    }
};
exports.PasswordService = PasswordService;
exports.PasswordService = PasswordService = PasswordService_1 = __decorate([
    (0, common_1.Injectable)()
], PasswordService);
//# sourceMappingURL=password.service.js.map