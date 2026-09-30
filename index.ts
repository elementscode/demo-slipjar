import { App, redirect } from "@elements/app";
import config from "#config";
import home from "#app/pages/home";
import signin from "#app/pages/signin";
import report from "#app/pages/report";
import queue from "#app/pages/queue";
import totals from "#app/pages/totals";
import serveReceipt from "#app/routes/receipts";
import notFound from "#app/pages/errors/not-found";
import unhandled from "#app/pages/errors/unhandled";

const app = new App();

app.route("/", home);
app.route("/signin", signin);
app.route("/reports/:id", report);
app.route("/queue", queue);
app.route("/totals", totals);
app.route("/receipts/:id/:hash", serveReceipt);

app.error((req, res, err) => {
  switch (err.statusCode) {
    case 401:
      return redirect("/signin");

    // Approver pages send an employee back to their own expenses.
    case 403:
      return redirect("/");

    case 404:
      return notFound(req, res, err);

    default:
      return unhandled(req, res, err);
  }
});

app.start(config);
