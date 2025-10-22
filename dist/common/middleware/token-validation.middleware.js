"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var TokenValidationMiddleware_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TokenValidationMiddleware = void 0;
const common_1 = require("@nestjs/common");
let TokenValidationMiddleware = TokenValidationMiddleware_1 = class TokenValidationMiddleware {
    logger = new common_1.Logger(TokenValidationMiddleware_1.name);
    use(req, res, next) {
        if (req.method === 'OPTIONS') {
            return next();
        }
        const authorization = req.headers.authorization;
        if (!authorization || !authorization.startsWith('Bearer ')) {
            this.logger.warn(`Authorization header missing for ${req.method} ${req.originalUrl}`);
            throw new common_1.UnauthorizedException('Authorization header missing or invalid.');
        }
        next();
    }
};
exports.TokenValidationMiddleware = TokenValidationMiddleware;
exports.TokenValidationMiddleware = TokenValidationMiddleware = TokenValidationMiddleware_1 = __decorate([
    (0, common_1.Injectable)()
], TokenValidationMiddleware);
//# sourceMappingURL=token-validation.middleware.js.map