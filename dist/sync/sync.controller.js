"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SyncController = void 0;
const common_1 = require("@nestjs/common");
const sync_service_1 = require("./sync.service");
const sync_records_dto_1 = require("./dto/sync-records.dto");
const sync_query_dto_1 = require("./dto/sync-query.dto");
const current_user_decorator_1 = require("../auth/decorators/current-user.decorator");
const swagger_1 = require("@nestjs/swagger");
let SyncController = class SyncController {
    syncService;
    constructor(syncService) {
        this.syncService = syncService;
    }
    async pull(entity, query, user) {
        return this.syncService.pull(entity, query, user);
    }
    async push(entity, payload, user) {
        return this.syncService.push(entity, payload, user);
    }
};
exports.SyncController = SyncController;
__decorate([
    (0, common_1.Get)(':entity'),
    (0, swagger_1.ApiOperation)({ summary: 'Recupera registros paginados de uma entidade com base em updatedAt/deletedAt.' }),
    (0, swagger_1.ApiParam)({ name: 'entity', description: 'Entidade alvo da sincronização.' }),
    (0, swagger_1.ApiQuery)({ name: 'since', required: false, description: 'Filtro por data/hora (ISO 8601).' }),
    (0, swagger_1.ApiQuery)({ name: 'limit', required: false, description: 'Quantidade máxima de registros.', schema: { type: 'integer', minimum: 1, default: 100 } }),
    (0, swagger_1.ApiQuery)({ name: 'offset', required: false, description: 'Deslocamento para paginação.', schema: { type: 'integer', minimum: 0, default: 0 } }),
    __param(0, (0, common_1.Param)('entity')),
    __param(1, (0, common_1.Query)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, sync_query_dto_1.SyncQueryDto, Object]),
    __metadata("design:returntype", Promise)
], SyncController.prototype, "pull", null);
__decorate([
    (0, common_1.Post)(':entity'),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    (0, swagger_1.ApiOperation)({ summary: 'Recebe registros para persistência a partir do Escritório ou PDV.' }),
    (0, swagger_1.ApiParam)({ name: 'entity', description: 'Entidade alvo da sincronização.' }),
    __param(0, (0, common_1.Param)('entity')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, sync_records_dto_1.SyncRecordsDto, Object]),
    __metadata("design:returntype", Promise)
], SyncController.prototype, "push", null);
exports.SyncController = SyncController = __decorate([
    (0, swagger_1.ApiTags)('sync'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Controller)('sync'),
    __metadata("design:paramtypes", [sync_service_1.SyncService])
], SyncController);
//# sourceMappingURL=sync.controller.js.map