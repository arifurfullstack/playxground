import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import { ThemeProvider } from "@/components/ThemeProvider";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import Feed from "./pages/Feed";
import Games from "./pages/Games";
import GameRoom from "./pages/GameRoom";
import Wallet from "./pages/Wallet";
import ManualPayment from "./pages/ManualPayment";
import AdminDashboard from "./pages/AdminDashboard";
import AdminUsers from "./pages/AdminUsers";
import AdminPosts from "./pages/AdminPosts";
import AdminReports from "./pages/AdminReports";
import AdminPayments from "./pages/AdminPayments";
import AdminGateways from "./pages/AdminGateways";
import AdminBankSettings from "./pages/AdminBankSettings";
import AdminSettings from "./pages/AdminSettings";
import Forbidden from "./pages/Forbidden";
import CreatorWithdrawal from "./pages/CreatorWithdrawal";
import CreatorDashboard from "./pages/CreatorDashboard";
import CreatorProfilePage from "./pages/CreatorProfilePage";
import Profile from "./pages/Profile";
import PostDetail from "./pages/PostDetail";
import Bookmarks from "./pages/Bookmarks";
import Settings from "./pages/Settings";
import Messages from "./pages/Messages";
import Discover from "./pages/Discover";
import Notifications from "./pages/Notifications";
import Suga4U from "./pages/Suga4U";
import Leaderboard from "./pages/Leaderboard";
import TruthOrDareRoom from "./pages/TruthOrDareRoom";
import NotFound from "./pages/NotFound";
import HomeMock from "./pages/HomeMock";
import ConfessionsRoom from "./pages/ConfessionsRoom";
import ConfessionsStudio from "./pages/ConfessionsStudio";
import FlashDropsRoom from "./pages/FlashDropsRoom";
import FlashDropsCreatorRoom from "./pages/FlashDropsCreatorRoom";
import XChatCreatorView from "./pages/XChatCreatorView";
import XChatRoom from "./pages/XChatRoom";
import BarLoungeRoom from "./pages/BarLoungeRoom";

const queryClient = new QueryClient();

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <NotificationProvider>
              <Routes>
                <Route path="/" element={<HomeMock />} />
                <Route path="/explore" element={<Feed />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/feed" element={<Feed />} />
                <Route path="/games" element={<Games />} />
                <Route path="/games/:roomId" element={<GameRoom />} />
                <Route path="/wallet" element={<Wallet />} />
                <Route path="/manual-payment" element={<ManualPayment />} />
                <Route path="/admin" element={<AdminDashboard />} />
                <Route path="/admin/users" element={<AdminUsers />} />
                <Route path="/admin/posts" element={<AdminPosts />} />
                <Route path="/admin/reports" element={<AdminReports />} />
                <Route path="/admin/payments" element={<AdminPayments />} />
                <Route path="/admin/gateways" element={<AdminGateways />} />
                <Route path="/admin/bank-settings" element={<AdminBankSettings />} />
                <Route path="/admin/settings" element={<AdminSettings />} />
                <Route path="/forbidden" element={<Forbidden />} />
                <Route path="/creator" element={<CreatorDashboard />} />
                <Route path="/creator/withdraw" element={<CreatorWithdrawal />} />
                <Route path="/profile/:id" element={<CreatorProfilePage />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/post/:postId" element={<PostDetail />} />
                <Route path="/bookmarks" element={<Bookmarks />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/messages" element={<Messages />} />
                <Route path="/discover" element={<Discover />} />
                <Route path="/notifications" element={<Notifications />} />
                <Route path="/suga4u" element={<Suga4U />} />
                <Route path="/leaderboard" element={<Leaderboard />} />
                <Route path="/games/truth-or-dare" element={<TruthOrDareRoom />} />
                <Route path="/games/truth-or-dare/:id" element={<TruthOrDareRoom />} />

                <Route path="/confessions/:creatorId" element={<ConfessionsRoom />} />
                <Route path="/confessions-studio" element={<ConfessionsStudio />} />
                <Route path="/flash-drops/:creatorId" element={<FlashDropsRoom />} />
                <Route path="/flash-drops-creator" element={<FlashDropsCreatorRoom />} />
                <Route path="/xchat-creator" element={<XChatCreatorView />} />
                <Route path="/x-chat/:creatorId" element={<XChatRoom />} />
                <Route path="/bar-lounge/:creatorId" element={<BarLoungeRoom />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </NotificationProvider>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
