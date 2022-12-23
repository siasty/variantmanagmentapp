
sap.ui.define([
	'sap/ui/core/mvc/Controller',
	"sap/ui/core/UIComponent",
	"sap/ui/table/TablePersoController",
],

	function (Controller, UIComponent, TablePersoController) {
		"use strict";

		var oMessagePopover;

		return Controller.extend("variantDemo.variantmanagmentapp.controller.BaseController", {

			/**
			 * Convenience method for accessing the router.
			 * @public
			 * @returns {sap.ui.core.routing.Router} the router for this component
			 */
			getRouter: function () {
				return UIComponent.getRouterFor(this);
			},

			/**
			 * Convenience method for getting the view model by name.
			 * @public
			 * @param {string} [sName] the model name
			 * @returns {sap.ui.model.Model} the model instance
			 */
			getModel: function (sName) {
				return this.getView().getModel(sName);
			},

			/**
			 * Convenience method for setting the view model.
			 * @public
			 * @param {sap.ui.model.Model} oModel the model instance
			 * @param {string} sName the model name
			 */
			setModel: function (oModel, sName) {
				return this.getView().setModel(oModel, sName);
			},

			/**
			 * Getter for the resource bundle.
			 * @public
			 * @returns {sap.ui.model.resource.ResourceModel} the resourceModel of the component
			 */
			getResourceBundle: function () {
				// @ts-ignore
				return this.getOwnerComponent().getModel("i18n").getResourceBundle();
			},



			getAllVariants: function (fnCallBack, containerName, variantSetName, variantMgmtControl, tableName) {
				var that = this;
				var oPersonalizationVariantSet = {},
					aExistingVariants = [],
					aVariantKeysAndNames = [];
				//get the personalization service of shell
				var _oPersonalizationService = sap.ushell.Container.getService('Personalization');
				var _oPersonalizationContainer = _oPersonalizationService.getPersonalizationContainer(containerName);
				_oPersonalizationContainer.fail(function () {
					fnCallBack(aExistingVariants);
				});
				_oPersonalizationContainer.done(function (oPersonalizationContainer) {
					// check if the current variant set exists, If not, add the new variant set to the container
					if (!(oPersonalizationContainer.containsVariantSet(variantSetName))) {
						oPersonalizationContainer.addVariantSet(variantSetName);
					}
					// get the variant set
					oPersonalizationVariantSet = oPersonalizationContainer.getVariantSet(variantSetName);
					aVariantKeysAndNames = oPersonalizationVariantSet.getVariantNamesAndKeys();
					for (var key in aVariantKeysAndNames) {
						if (aVariantKeysAndNames.hasOwnProperty(key)) {
							var oVariantItemObject = {};
							oVariantItemObject.VariantKey = aVariantKeysAndNames[key];
							oVariantItemObject.VariantName = key;
							aExistingVariants.push(oVariantItemObject);
						}
					}

					// seting default variant
					oPersonalizationVariantSet.getVariantKeys().forEach(function (sKey) {
						var sVariant = oPersonalizationVariantSet.getVariant(sKey);
						
						if (sVariant.getItemValue("Default")) {
							that.getView().byId(variantMgmtControl).setDefaultVariantKey(sKey);
							that.getView().byId(variantMgmtControl).setInitialSelectionKey(sKey);

							var aColumns = JSON.parse(sVariant.getItemValue("ColumnsVal"));
							// Hide all columns first
							that.getView().byId(tableName).getColumns().forEach(function (oColumn) {
								oColumn.setVisible(false);
							});
							// re-arrange columns according to the saved variant
							aColumns.forEach(function (aColumn) {
								var aTableColumn = $.grep(that.getView().byId(tableName).getColumns(), function (el, id) {
									return el.getProperty("name") === aColumn.fieldName;
								});
								if (aTableColumn.length > 0) {
									aTableColumn[aColumn.index].setVisible(aColumn.Visible);
								}
							}.bind(that));
						}
					});

					fnCallBack(aExistingVariants);
				}.bind(this));
			},

			setPersoController: function (tablePersoControllerCallback, containerName, tableName) {
				var _oPersonalizationService = sap.ushell.Container.getService('Personalization');
				var _oPersonalizationContainer = _oPersonalizationService.getPersonalizationContainer(containerName);
				var oComponent = sap.ui.core.Component.getOwnerComponentFor(this.getView());

				var oPersId = {
					container: containerName, //any
					item: tableName           //any- I have used the table name 
				};
				// define scope 
				var oScope = {
					keyCategory: _oPersonalizationService.constants.keyCategory.FIXED_KEY,
					writeFrequency: _oPersonalizationService.constants.writeFrequency.LOW,
					clientStorageAllowed: true
				};
				// Get a Personalizer
				var oPersonalizer = _oPersonalizationService.getPersonalizer(oPersId, oScope, oComponent);
				tablePersoControllerCallback(new TablePersoController({
					table: this.getView().byId(tableName),
					persoService: oPersonalizer
				}));
			},

			saveVariant: function (VariantParam, containerName, variantSetName, tableName, fnCallBack) {

				var that = this;
				var _oPersonalizationService = sap.ushell.Container.getService('Personalization');
				var _oPersonalizationContainer = _oPersonalizationService.getPersonalizationContainer(containerName);
				_oPersonalizationContainer.done(function (oPersonalizationContainer) {
					var oPersonalizationVariantSet = {},
						oVariant = {},
						sVariantKey = "";
					// check if the current variant set exists, If not, add the new variant set to the container
					if (!(oPersonalizationContainer.containsVariantSet(variantSetName))) {
						oPersonalizationContainer.addVariantSet(variantSetName);
					}
					// get the variant set
					oPersonalizationVariantSet = oPersonalizationContainer.getVariantSet(variantSetName);

					// get columns data: 
					var aColumnsData = [];
					that.getView().byId(tableName).getColumns().forEach(function (oColumn, index) {
						var aColumn = {};
						aColumn.fieldName = oColumn.getProperty("name");
						aColumn.Id = oColumn.getId();
						aColumn.index = index;
						aColumn.Visible = oColumn.getVisible();
						aColumnsData.push(aColumn);
					});

					oVariant = oPersonalizationVariantSet.addVariant(VariantParam.name);
					if (oVariant) {
						oVariant.setItemValue("ColumnsVal", JSON.stringify(aColumnsData));
						if (VariantParam.def === true) {
							this.setNewDefaultVariantKey(oVariant.getVariantKey(), containerName, variantSetName);
							oPersonalizationVariantSet.setCurrentVariantKey(oVariant.getVariantKey());
						}

						oPersonalizationContainer.save().done(function () {
							// Tell the user that the personalization data was saved
						});
					}
				}.bind(this));
			},

			manageVariant: function (oEvent, containerName, variantSetName, fnCallBack) {
				var aParameters = oEvent.getParameters(),
					aRenamedVariants = oEvent.mParameters.renamed;
				var _oPersonalizationService = sap.ushell.Container.getService('Personalization');
				var _oPersonalizationContainer = _oPersonalizationService.getPersonalizationContainer(containerName);
				_oPersonalizationContainer.done(function (oPersonalizationContainer) {
					var oPersonalizationVariantSet = {},
						oVariant = {},
						sVariantKey = "";

					if (!(oPersonalizationContainer.containsVariantSet(variantSetName))) {
						oPersonalizationContainer.addVariantSet(variantSetName);
					}
					oPersonalizationVariantSet = oPersonalizationContainer.getVariantSet(variantSetName);

					// default variant change
					if (aParameters.def !== "*standard*") {
						this.setNewDefaultVariantKey(aParameters.def, containerName, variantSetName);
						oPersonalizationVariantSet.setCurrentVariantKey(aParameters.def);
					} else {
						oPersonalizationVariantSet.setCurrentVariantKey(null);
					}


					if (aRenamedVariants.length > 0) {
						aParameters.renamed.forEach(function (aRenamed) {
							var sVariant = oPersonalizationContainer.getVariant(aRenamed.key),
								sItemValue = sVariant.getItemValue("ColumnsVal");
							// delete the variant 
							oPersonalizationVariantSet.getVariant(aRenamed.key);
							oPersonalizationVariantSet.delVariant(aRenamed.key);
							// after delete, add a new variant
							var oNewVariant = oPersonalizationVariantSet.addVariant(aRenamed.name);
							oNewVariant.setItemValue("ColumnsVal", sItemValue);
						}.bind(this));
					}

					// Delete variants
					if (aParameters.deleted.length > 0) {
						aParameters.deleted.forEach(function (aDelete) {
							oPersonalizationVariantSet.getVariant(aDelete);
							oPersonalizationVariantSet.delVariant(aDelete);
						}.bind(this));
					}
					//  Save the Variant Container
					oPersonalizationContainer.save().done(function () {
						// Tell the user that the personalization data was saved
					});

				}.bind(this));

			},

			setSelectedVariantToTable: function (oEvent, containerName, variantSetName, tableName) {
				var oSelectedVariant;
				var selectedKey = oEvent.getParameters().key;
				for (var i = 0; i < oEvent.getSource().getVariantItems().length; i++) {
					if (oEvent.getSource().getVariantItems()[i].getProperty("key") === selectedKey) {
						var oSelectedVariant = oEvent.getSource().getVariantItems()[i].getProperty("text");
						break;
					}
				}

				var oPersonalizationVariantSet = {};
				var that = this;

				var _oPersonalizationService = sap.ushell.Container.getService('Personalization');
				var _oPersonalizationContainer = _oPersonalizationService.getPersonalizationContainer(containerName);
				_oPersonalizationContainer.done(function (oPersonalizationContainer) {
					if (oSelectedVariant) {
						if (!(oPersonalizationContainer.containsVariantSet(variantSetName))) {
							oPersonalizationContainer.addVariantSet(variantSetName);
						}
						oPersonalizationVariantSet = oPersonalizationContainer.getVariantSet(variantSetName);

						var sVariant = oPersonalizationVariantSet.getVariant(oPersonalizationVariantSet.getVariantKeyByName(oSelectedVariant));

						var aColumns = JSON.parse(sVariant.getItemValue("ColumnsVal"));
						// Hide all columns first
						that.getView().byId(tableName).getColumns().forEach(function (oColumn) {
							oColumn.setVisible(false);
						});
						// re-arrange columns according to the saved variant

						aColumns.forEach(function (aColumn) {
							var aTableColumn = $.grep(that.getView().byId(tableName).getColumns(), function (el, id) {
								return el.getProperty("name") === aColumn.fieldName;
							});
							if (aTableColumn.length > 0) {
								aTableColumn[aColumn.index].setVisible(aColumn.Visible);

							}
						}.bind(that));
					}
					// null means the standard variant is selected or the variant which is not available, then show all columns
					else {
						that.getView().byId(tableName).getColumns().forEach(function (oColumn) {
							oColumn.setVisible(true);
						});
					}
				});

			},

			setNewDefaultVariantKey: function (sNewDefaultVariantKey, containerName, variantSetName) {
				var _oPersonalizationService = sap.ushell.Container.getService('Personalization');
				var _oPersonalizationContainer = _oPersonalizationService.getPersonalizationContainer(containerName);
				_oPersonalizationContainer.done(function (oPersonalizationContainer) {
					var oPersonalizationVariantSet,
						oVariant;

					if (!(oPersonalizationContainer.containsVariantSet(variantSetName))) {
						oPersonalizationContainer.addVariantSet(variantSetName);
					}
					oPersonalizationVariantSet = oPersonalizationContainer.getVariantSet(variantSetName);

					oVariant = oPersonalizationVariantSet.getVariant(sNewDefaultVariantKey);

					oPersonalizationVariantSet.getVariantKeys().forEach(function (sKey) {
						oPersonalizationVariantSet.getVariant(sKey).setItemValue("Default", false);
					});

					if (oVariant) { // It is not the standard one
						oVariant.setItemValue("Default", true);
					}

					oPersonalizationContainer.save().fail(function () {
						// Error handling
					}.bind(this));
				}.bind(this));
			},


		});
	});