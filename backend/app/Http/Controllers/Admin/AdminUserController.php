<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\UpdateUserRequest;
use App\Services\AdminService;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Admin user management (S5-T3): list, view, update, soft-delete.
 *
 * Thin controller — all logic lives in AdminService. Every route is behind
 * auth:sanctum + role:ADMIN (see routes/api.php), so authorization is not
 * re-checked here. There is no impersonation / user-switching action.
 */
class AdminUserController extends Controller
{
    use ApiResponse;

    public function __construct(
        private AdminService $adminService
    ) {}

    /**
     * GET /api/v1/admin/users?role=&search=&per_page=&page=
     */
    public function index(Request $request): JsonResponse
    {
        $users = $this->adminService->listUsers([
            'role'     => $request->query('role'),
            'search'   => $request->query('search'),
            'per_page' => $request->integer('per_page', 15),
            'sort' => $request->query('sort', 'recent'),
            'account_status' => $request->query('account_status'),
            'active_only' => $request->boolean('active_only'),
        ]);

        return $this->successResponse($users, 'Users retrieved');
    }

    /**
     * GET /api/v1/admin/users/{id}
     */
    public function show(string $id): JsonResponse
    {
        $user = $this->adminService->getUser($id);

        if ($user === null) {
            return $this->errorResponse('User not found', 404);
        }

        return $this->successResponse($user, 'User retrieved');
    }

    /**
     * PUT /api/v1/admin/users/{id}
     */
    public function update(UpdateUserRequest $request, string $id): JsonResponse
    {
        $user = $this->adminService->updateUser(
            $id,
            $request->validated(),
            $request->user(),
        );

        if ($user === null) {
            return $this->errorResponse('User not found', 404);
        }

        return $this->successResponse($user, 'User updated');
    }

    /**
     * DELETE /api/v1/admin/users/{id}
     */
    public function destroy(Request $request, string $id): JsonResponse
    {
        $deleted = $this->adminService->deleteUser($id, $request->user());

        if (! $deleted) {
            return $this->errorResponse('User not found', 404);
        }

        return $this->successResponse(null, 'User deleted');
    }
}
