import { Router } from "express";
import { protect } from "../../middleware/authMiddleware";
import { isAdmin } from "../../middleware/adminMiddleware";
import {
  makeAdmin,
  revokeAdmin,
  getAllUsers,
  suspendUser,
  unsuspendUser,
} from "./admin.controller";

const router = Router();

router.use("/admin", protect, isAdmin);

router.get("/admin/users", getAllUsers);
router.put("/admin/users/:userId/make-admin", makeAdmin);
router.put("/admin/users/:userId/revoke-admin", revokeAdmin);
router.put("/admin/users/:userId/suspend", suspendUser);
router.put("/admin/users/:userId/unsuspend", unsuspendUser);

export default router;
