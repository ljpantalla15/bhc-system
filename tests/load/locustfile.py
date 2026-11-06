"""
Locust Load Test for BHC System API (Step 12)
Simulates concurrent health center staff (Midwife and BHW) executing realistic workloads:
authentication, resident directory lookups, household grouped queries, and target masterlists.

Usage:
    locust -f tests/load/locustfile.py --host http://localhost:3000
"""

from locust import HttpUser, task, between
import random

class BHCStaffUser(HttpUser):
    wait_time = between(1, 3)

    def on_start(self):
        """Authenticate before running workload tasks."""
        # Pick between midwife (unrestricted read) and bhw (zone-restricted read/write)
        user_choice = random.choice([
            {"username": "midwife1", "password": "Demo#12345"},
            {"username": "bhw1", "password": "Demo#12345"},
            {"username": "bhw2", "password": "Demo#12345"}
        ])

        response = self.client.post(
            "/api/auth/login",
            json=user_choice,
            name="[Auth] POST /api/auth/login"
        )

        if response.status_code == 200:
            token = response.json().get("token")
            self.headers = {"Authorization": f"Bearer {token}"}
        else:
            self.headers = {}

    @task(4)
    def view_residents_directory(self):
        """Simulate browsing resident directory."""
        if not hasattr(self, "headers"):
            return
        self.client.get(
            "/api/residents?limit=20&page=1",
            headers=self.headers,
            name="[Residents] GET /api/residents"
        )

    @task(3)
    def view_residents_by_household(self):
        """Simulate browsing residents grouped by household."""
        if not hasattr(self, "headers"):
            return
        self.client.get(
            "/api/residents?group_by=household&limit=10&page=1",
            headers=self.headers,
            name="[Residents] GET /api/residents?group_by=household"
        )

    @task(2)
    def view_senior_citizen_masterlist(self):
        """Simulate generating senior citizen masterlist."""
        if not hasattr(self, "headers"):
            return
        self.client.get(
            "/api/masterlists?category=SENIOR_CITIZEN",
            headers=self.headers,
            name="[Masterlist] GET /api/masterlists?category=SENIOR_CITIZEN"
        )

    @task(2)
    def view_under_five_masterlist(self):
        """Simulate generating under-5 masterlist."""
        if not hasattr(self, "headers"):
            return
        self.client.get(
            "/api/masterlists?category=UNDER_FIVE",
            headers=self.headers,
            name="[Masterlist] GET /api/masterlists?category=UNDER_FIVE"
        )

    @task(1)
    def view_pregnant_masterlist(self):
        """Simulate generating pregnant women masterlist."""
        if not hasattr(self, "headers"):
            return
        self.client.get(
            "/api/masterlists?category=PREGNANT",
            headers=self.headers,
            name="[Masterlist] GET /api/masterlists?category=PREGNANT"
        )

