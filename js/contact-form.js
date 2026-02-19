"use strict";

(function () {
  const form = document.getElementById("contactForm");
  const statusEl = document.getElementById("contactFormStatus");

  if (!form || !statusEl) {
    return;
  }

  const submitButton = form.querySelector('input[type="submit"], button[type="submit"]');

  function setStatus(message, isError) {
    statusEl.style.display = "block";
    statusEl.style.color = isError ? "#b91c1c" : "#166534";
    statusEl.textContent = message;
  }

  form.addEventListener("submit", async function (event) {
    event.preventDefault();

    const data = {
      name: form.name.value.trim(),
      email: form.email.value.trim(),
      message: form.message.value.trim(),
    };

    if (!data.name || !data.email || !data.message) {
      setStatus("Please complete name, email, and message.", true);
      return;
    }

    if (submitButton) {
      submitButton.disabled = true;
      submitButton.value = "Sending...";
    }

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await response.json().catch(function () {
        return {};
      });

      if (!response.ok) {
        throw new Error(result.message || "Unable to send your message.");
      }

      form.reset();
      setStatus("Thanks. Your message was sent successfully.", false);
    } catch (error) {
      setStatus(error.message || "Unable to send your message.", true);
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.value = "Submit";
      }
    }
  });
})();
