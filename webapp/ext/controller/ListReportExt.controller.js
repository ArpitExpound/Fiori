sap.ui.define([
  "sap/ui/core/mvc/ControllerExtension",
  "sap/ui/model/odata/v2/ODataModel",
  "sap/ui/model/json/JSONModel",
  "sap/m/MessageToast",
  "sap/m/Dialog",
  "sap/m/Button",
  "sap/m/Text",
  "sap/m/ColumnListItem"
], function (
  ControllerExtension, ODataModel, JSONModel, MessageToast,
  Dialog, Button, Text, ColumnListItem
) {
  "use strict";

  return ControllerExtension.extend("project.ext.controller.ListReportExt", {
    // ----------------- lifecycle -----------------
    override: {
      onInit: function () {
        var oView = this.base.getView();
        var aSmartTables = oView.findAggregatedObjects(true, function (c) {
          return c.isA && c.isA("sap.ui.comp.smarttable.SmartTable");
        });

        if (!aSmartTables || !aSmartTables.length) {
          setTimeout(this._wireUp.bind(this), 0);
        } else {
          this._wireUp(aSmartTables[0]);
        }
      }
    },

    _wireUp: function (oSmartTableParam) {
      var oView = this.base.getView();

      var oSmartTable = oSmartTableParam || oView.findAggregatedObjects(true, function (c) {
        return c.isA && c.isA("sap.ui.comp.smarttable.SmartTable");
      })[0];

      if (!oSmartTable) {
        setTimeout(this._wireUp.bind(this), 100);
        return;
      }

      oSmartTable.attachInitialise(function () {
        // 1) Add custom toolbar button
        var oToolbar = oSmartTable.getToolbar();
        var sBtnId = oView.createId("confirmBtn");
        if (!oView.byId("confirmBtn")) {
          oToolbar.addContent(new Button({
            id: sBtnId,
            text: "Confirm Selection",
            press: this.onOpenDialog.bind(this)
          }));
        }

        // 2) Manual binding preparation
        var oTable = oSmartTable.getTable();
        var oItemsInfo = oTable.getBindingInfo("items");
        this._oItemTemplate =
          (oItemsInfo && oItemsInfo.template && oItemsInfo.template.clone()) ||
          new ColumnListItem({
            cells: [
              new Text({ text: "{SupplierId}" }),
              new Text({ text: "{SupplierName}" }),
              new Text({ text: "{OpeningBalance}" }),
              new Text({ text: "{Debit}" }),
              new Text({ text: "{ClosingBalance}" }),
              new Text({ text: "{Credit}" })
            ]
          });

        oSmartTable.setEnableAutoBinding(false);
        oTable.unbindItems();

        if (oTable.setMode) {
          oTable.setMode("MultiSelect");
        }

        oTable.attachSelectionChange(this._onSelectionChange, this);

        this._loadLedgerData(oTable);
      }.bind(this));
    },

    _loadLedgerData: function (oTable) {
      var oODataModel = new ODataModel("/sap/opu/odata/sap/ZSB_LEDGER/");
      oODataModel.read("/ZC_LEDGER", {
        success: function (oData) {
          var oJSONModel = new JSONModel(oData.results);
          oTable.setModel(oJSONModel);
          oTable.bindItems({ path: "/", template: this._oItemTemplate });
        }.bind(this),
        error: function (e) {
          MessageToast.show("Error fetching ledger data");
          console.error("OData read error", e);
        }
      });
    },

    // ----------------- dialog helpers -----------------
    _openConfirmDialog: function (aIds) {
      if (!aIds || !aIds.length) { return; }

      var sMsg = "Are you sure you want to confirm these IDs?\n\n" + aIds.join(", ");

      var oDialog = new Dialog({
        title: "Confirm Action",
        type: "Message",
        content: new Text({ text: sMsg }),
        beginButton: new Button({
          text: "Confirm",
          press: function () {
            MessageToast.show("Confirmed IDs: " + aIds.join(", "));
            oDialog.close();
          }
        }),
        endButton: new Button({
          text: "Cancel",
          press: function () { oDialog.close(); }
        }),
        afterClose: function () { oDialog.destroy(); }
      });

      this.base.getView().addDependent(oDialog);
      oDialog.open();
    },

    // ----------------- UI events -----------------
    _onSelectionChange: function (oEvent) {
      var oTable = oEvent.getSource();
      var aSel = oTable.getSelectedItems();
      if (!aSel.length) { return; }

      var aIds = aSel.map(function (item) {
        return item.getBindingContext().getProperty("SupplierId");
      });
      this._openConfirmDialog(aIds);
    },

    onOpenDialog: function () {
      var oSmartTable = this.base.getView().findAggregatedObjects(true, function (c) {
        return c.isA && c.isA("sap.ui.comp.smarttable.SmartTable");
      })[0];
      if (!oSmartTable) { return; }

      var oTable = oSmartTable.getTable();
      var aSel = oTable.getSelectedItems();
      if (!aSel.length) {
        MessageToast.show("Please select at least one row");
        return;
      }

      var aIds = aSel.map(function (item) {
        return item.getBindingContext().getProperty("SupplierId");
      });
      this._openConfirmDialog(aIds);
    }
  });
});
