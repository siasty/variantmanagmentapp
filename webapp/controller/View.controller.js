sap.ui.define([
    "variantDemo/variantmanagmentapp/controller/BaseController"
],
    
    function (BaseController) {
        "use strict";

        return BaseController.extend("variantDemo.variantmanagmentapp.controller.View", {
            onInit: function () {

                var oVariantMgmtControl = this.getView().byId("variantManagement"),
                    oVariantModel = new sap.ui.model.json.JSONModel();

                    this.getAllVariants(function (aVariants) {
                        oVariantModel.oData.Variants = aVariants;
                        oVariantMgmtControl.setModel(oVariantModel);
                    }.bind(this), "AppVariantContainer", "AppVariants", "variantManagement", "tableId");

                this.setPersoController(function (persoController) {
                    this._oTPC = persoController;
                }.bind(this), "AppVariantContainer", "tableId");
            },

            onPersoButtonPressed: function (oEvent) {
                this._oTPC.openDialog();
            },

            onSaveAsVariant: function (oEvent) {
                this.saveVariant(oEvent.getParameters(),"AppVariantContainer", "AppVariants","tableId", function () {
                }.bind(this));
            },


            onManageVariant: function (oEvent) {
                this.manageVariant(oEvent,"AppVariantContainer", "AppVariants", function () {
                }.bind(this));

            },

            onSelectVariant: function (oEvent) {
                this.setSelectedVariantToTable(oEvent,"AppVariantContainer", "AppVariants","tableId");
            },

        });
    });
