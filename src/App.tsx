import { Route, Routes } from "react-router-dom";
import { Navbar } from "./components/Navbar";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { HomeSearchPage } from "./pages/HomeSearchPage";
import { FlightSelectionPage } from "./pages/FlightSelectionPage";
import { PassengerDetailsPage } from "./pages/PassengerDetailsPage";
import { SeatSelectionPage } from "./pages/SeatSelectionPage";
import { AdditionalServicesPage } from "./pages/AdditionalServicesPage";
import { BookingSummaryPage } from "./pages/BookingSummaryPage";
import { PaymentPage } from "./pages/PaymentPage";
import { ConfirmationPage } from "./pages/ConfirmationPage";
import { SignInPage } from "./pages/SignInPage";
import { SignUpPage } from "./pages/SignUpPage";
import { MyBookingsPage } from "./pages/MyBookingsPage";
import { BookingDetailPage } from "./pages/BookingDetailPage";

function App() {
  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <Routes>
          <Route path="/" element={<HomeSearchPage />} />
          <Route path="/booking/select" element={<FlightSelectionPage />} />
          <Route
            path="/booking/passengers"
            element={
              <ProtectedRoute>
                <PassengerDetailsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/booking/seats"
            element={
              <ProtectedRoute>
                <SeatSelectionPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/booking/services"
            element={
              <ProtectedRoute>
                <AdditionalServicesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/booking/summary"
            element={
              <ProtectedRoute>
                <BookingSummaryPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/booking/payment"
            element={
              <ProtectedRoute>
                <PaymentPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/booking/confirmation/:id"
            element={
              <ProtectedRoute>
                <ConfirmationPage />
              </ProtectedRoute>
            }
          />
          <Route path="/sign-in" element={<SignInPage />} />
          <Route path="/sign-up" element={<SignUpPage />} />
          <Route
            path="/my-bookings"
            element={
              <ProtectedRoute>
                <MyBookingsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/bookings/:id"
            element={
              <ProtectedRoute>
                <BookingDetailPage />
              </ProtectedRoute>
            }
          />
        </Routes>
      </main>
    </div>
  );
}

export default App;
